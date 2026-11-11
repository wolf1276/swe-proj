/** One-command local demo. Restores only named synthetic demo fixtures. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";

const password = "CampusTrade-Demo-2026!";
async function main() {
  if (!existsSync(".env")) {
    const template = readFileSync(".env.example", "utf8").replace("replace-with-a-generated-secret-at-least-32-chars", randomBytes(32).toString("hex"));
    writeFileSync(".env", template, { mode: 0o600 });
  }
  process.loadEnvFile();
  const origin = new URL(process.env.APP_URL ?? "http://localhost:3000");
  const database = new URL(process.env.DATABASE_URL ?? "");
  const domains = (process.env.APPROVED_DOMAINS ?? "campus.example").split(",").map(d => d.trim().toLowerCase());
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(origin.hostname) || !["localhost", "127.0.0.1"].includes(database.hostname) || (process.env.MAIL_ADAPTER ?? "sink") !== "sink" || domains.length !== 1 || domains[0] !== "campus.example") {
    throw new Error("Demo requires local application/database, MAIL_ADAPTER=sink and the synthetic campus.example domain.");
  }
  const childEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "development", DEV_SEED_PASSWORD: password };
  execFileSync("docker", ["compose", "up", "-d", "--wait", "--wait-timeout", "60", "postgres"], { env: childEnv, stdio: "inherit" });
  execFileSync("pnpm", ["db:generate"], { env: childEnv, stdio: "inherit" });
  execFileSync("pnpm", ["db:deploy"], { env: childEnv, stdio: "inherit" });
  execFileSync("pnpm", ["seed"], { env: childEnv, stdio: "inherit" });

  const { prisma } = await import("../src/lib/prisma");
  try {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: "a.student@campus.example" } });
    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "b.student@campus.example" } });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: "textbooks" } });
    const labCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "lab-equipment" } });
    const fixtures = [
      { id: "d3e00000-0000-4000-8000-000000000001", title: "Demo: Engineering mathematics textbook", offerType: "sale" as const, priceMinor: 45000, description: "Clean textbook with all pages intact. A ready-to-show campus sale listing." },
      { id: "d3e00000-0000-4000-8000-000000000002", title: "Demo: Lab coat and goggles", offerType: "donation" as const, priceMinor: null, description: "Free clean lab coat and safety goggles for a fellow student." },
      { id: "d3e00000-0000-4000-8000-000000000003", title: "Demo: Calculator needing review", offerType: "sale" as const, priceMinor: 60000, description: "Claimed as new, but the demonstration report says the display is damaged. Review before deciding." },
    ];
    for (const fixture of fixtures) {
      const existing = await prisma.listing.findUnique({ where: { id: fixture.id } });
      if (existing && (existing.ownerId !== owner.id || !existing.title.startsWith("Demo:"))) throw new Error("Demo fixture ID is already used by unrelated data");
      const data = { ...fixture, ownerId: owner.id, categoryId: fixture.offerType === "donation" ? labCategory.id : category.id, condition: "good" as const, availability: "available" as const, moderationState: "visible" as const, deletedAt: null };
      await prisma.listing.upsert({ where: { id: fixture.id }, create: data, update: { ...data, version: { increment: 1 } } });
    }
    await prisma.listingReport.upsert({
      where: { id: "d3e00000-0000-4000-8000-000000000004" },
      create: { id: "d3e00000-0000-4000-8000-000000000004", listingId: fixtures[2].id, reporterId: buyer.id, reason: "misleading", details: "Demo report: the calculator condition does not match its description." },
      update: { state: "pending", reviewerId: null, reviewReason: null, resolvedAt: null },
    });
  } finally { await prisma.$disconnect(); }

  console.log(`\nCampusTrade demo: ${origin.origin}/sign-in`);
  console.log("Owner: a.student@campus.example\nBuyer: b.student@campus.example\nAdmin: admin@campus.example");
  console.log(`Password for these synthetic demo accounts: ${password}`);
  console.log("Search for Demo: to find the three restored demo listings. Walkthrough: demo.md\n");
  if (process.argv.includes("--prepare-only")) return;
  try {
    const response = await fetch(new URL("/api/health", origin), { signal: AbortSignal.timeout(2500) });
    const body = await response.json();
    if (response.ok && body.status === "ok" && body.database === "up") {
      console.log("The local server is already running. Open the demo link above.");
      return;
    }
  } catch { /* Start the local server below. */ }
  const server = spawn("pnpm", ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", origin.port || "3000"], { env: childEnv, stdio: "inherit" });
  for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => server.kill(signal));
  server.on("exit", code => { process.exitCode = code ?? 0; });
}
main().catch(error => { console.error("Demo setup failed:", error); process.exitCode = 1; });
