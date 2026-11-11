/** Non-destructive local synthetic backup/restore and recovered-app smoke. */
import { execFileSync, spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertTestDatabase } from "./test-database";
import { startTestHttps, startTestSmtp } from "./local-test-services";

async function main() {
  const source = new URL(process.env.TEST_DATABASE_URL ?? ""); source.pathname = "/campustrade_e2e";
  assertTestDatabase(source.href, process.env.DATABASE_URL);
  const databaseName = `campustrade_restore_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
  const restored = new URL(source); restored.pathname = `/${databaseName}`;
  const before = new PrismaClient({ adapter: new PrismaPg({ connectionString: source.href }) });
  const snapshot = async (db: PrismaClient) => {
    // Hash complete, stably ordered rows in memory; only the digest is
    // emitted, never passwords/session tokens/contact bodies.
    const rows = await Promise.all([
      db.user.findMany({ orderBy: { id: "asc" } }), db.account.findMany({ orderBy: { id: "asc" } }),
      db.session.findMany({ orderBy: { id: "asc" } }), db.category.findMany({ orderBy: { id: "asc" } }),
      db.listing.findMany({ orderBy: { id: "asc" } }), db.contactRequest.findMany({ orderBy: { id: "asc" } }),
      db.listingReport.findMany({ orderBy: { id: "asc" } }), db.auditEvent.findMany({ orderBy: { id: "asc" } }),
      db.verification.findMany({ orderBy: { id: "asc" } }), db.rateLimitBucket.findMany({ orderBy: { key: "asc" } }),
    ]);
    return { users: rows[0].length, listings: rows[4].length, contacts: rows[5].length, reports: rows[6].length, audits: rows[7].length,
      removed: await db.listing.count({ where: { moderationState: "removed" } }), visible: await db.listing.count({ where: { moderationState: "visible", deletedAt: null, availability: "available" } }),
      dataDigest: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    };
  };
  let expected;
  let historicalContact: { id: string; message: string | null } | null = null;
  try {
    if (await before.user.count({ where: { NOT: { email: { endsWith: ".example" } } } })) throw new Error("Recovery test refuses non-synthetic identities");
    expected = await snapshot(before);
    historicalContact = await before.contactRequest.findFirst({ where: { requester: { email: "b.student@campus.example" } }, select: { id: true, message: true } });
  } finally { await before.$disconnect(); }
  // All database names are fixed/generated internally; no shell interpolation.
  const dump = execFileSync("docker", ["exec", "campustrade-postgres", "pg_dump", "-U", "campustrade", "-Fc", "campustrade_e2e"]);
  execFileSync("docker", ["exec", "campustrade-postgres", "psql", "-U", "campustrade", "-d", "postgres", "-c", `CREATE DATABASE ${databaseName};`], { stdio: "ignore" });
  execFileSync("docker", ["exec", "-i", "campustrade-postgres", "pg_restore", "-U", "campustrade", "--no-owner", "--no-privileges", "-d", databaseName], { input: dump, stdio: ["pipe", "ignore", "pipe"] });
  const after = new PrismaClient({ adapter: new PrismaPg({ connectionString: restored.href }) });
  let actual;
  try { actual = await snapshot(after); } finally { await after.$disconnect(); }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Restored data counts/visibility do not match snapshot");
  const smtp = await startTestSmtp(2528, ".mail-recovery");
  const proxy = await startTestHttps(3400, 3401);
  const runtimeEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: restored.href, APP_URL: "https://localhost:3400", NODE_ENV: "production", NEXT_DIST_DIR: ".next-e2e", APPROVED_DOMAINS: "campus.example", BETTER_AUTH_SECRET: "recovery-local-only-secret-0123456789abcdef0123456789", MAIL_ADAPTER: "smtp", SMTP_URL: "smtp://127.0.0.1:2528", SMTP_FROM: "CampusTrade <no-reply@campus.example>" };
  const server = spawn("pnpm", ["exec", "next", "start", "--port", "3401"], { env: runtimeEnv, stdio: "ignore", detached: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL: "https://localhost:3400", ignoreHTTPSErrors: true });
    let healthy = false;
    for (let i = 0; i < 60; i++) {
      try { healthy = (await context.request.get("/api/health")).ok(); } catch { /* starting */ }
      if (healthy) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!healthy) throw new Error("Recovered app is not ready");
    const denied = await context.request.get("/api/listings");
    if (denied.status() !== 401) throw new Error("Recovered app lost anonymous protection");
    const page = await context.newPage();
    await page.goto("/sign-in");
    await page.getByLabel("Campus email", { exact: true }).fill("b.student@campus.example");
    await page.getByLabel("Password", { exact: true }).fill("local-seed-pass-1234");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/listings");
    await page.getByRole("region", { name: "Search results" }).locator("li").first().waitFor();
    const catalogue = await (await context.request.get("/api/listings?availability=all")).json();
    const contacts = await (await context.request.get("/api/contacts")).json();
    if (!historicalContact || !contacts.items.some((contact: { id: string; message: string }) => contact.id === historicalContact!.id && contact.message === (historicalContact!.message ?? ""))) throw new Error("Historical participant contact was not recovered");
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: restored.href }) });
    try {
      const hidden = await db.listing.findFirst({ where: { moderationState: "removed" } });
      if (!hidden || (await context.request.get(`/api/listings/${hidden.id}`)).status() !== 404) throw new Error("Recovered removal visibility failed");
      const buyer = await db.user.findUniqueOrThrow({ where: { email: "b.student@campus.example" } });
      const owner = await db.user.findUniqueOrThrow({ where: { email: "a.student@campus.example" } });
      const category = await db.category.findFirstOrThrow();
      const item = await db.listing.create({ data: { ownerId: owner.id, title: "Recovery contact smoke", description: "Synthetic recovery fixture", categoryId: category.id, offerType: "donation", priceMinor: null, condition: "good", availability: "available" } });
      const contact = await context.request.post(`/api/listings/${item.id}/contacts`, { headers: { origin: "https://localhost:3400" }, data: { message: "Recovered coordination" } });
      if (contact.status() !== 201 || !await db.contactRequest.findUnique({ where: { listingId_requesterId: { listingId: item.id, requesterId: buyer.id } } })) throw new Error("Recovered durable contact failed");
    } finally { await db.$disconnect(); }
    await mkdir("tests/evidence", { recursive: true });
    await writeFile("tests/evidence/recovery.json", JSON.stringify({ at: new Date().toISOString(), source: "campustrade_e2e", restoredDatabase: databaseName, backupBytes: dump.length, expected, actual, checks: { snapshotCountsAndVisibility: "pass", completeDataDigest: "pass", historicalParticipantContact: "pass", anonymousDenied: "pass", browserSignInAndBrowse: "pass", removedDetailDenied: "pass", contactPersisted: "pass" }, catalogueTotal: catalogue.total, note: "Local synthetic PostgreSQL pg_dump/pg_restore only; not a production recovery certification" }, null, 2));
    console.log("Backup/restore counts, visibility, browser access and durable contact: PASS");
  } finally {
    await browser.close();
    if (server.pid) { try { process.kill(-server.pid, "SIGTERM"); } catch { /* exited */ } }
    smtp.close(); proxy.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
