/** Local displayed-results benchmark, not approved campus workload/uptime. */
import { assessSearch } from "./measurement";
import { startTestHttps, startTestSmtp } from "./local-test-services";
import { chromium } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertTestDatabase } from "./test-database";

async function main() {
  const durationSeconds = Number(process.env.PERF_DURATION_SECONDS ?? 600);
  const concurrency = Number(process.env.PERF_CONCURRENCY ?? 10);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) throw new Error("Invalid benchmark duration/concurrency");
  const target = new URL(process.env.PERF_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? "");
  target.pathname = "/campustrade_perf";
  assertTestDatabase(target.href, process.env.DATABASE_URL);
  const maintenance = new URL(target); maintenance.pathname = "/postgres";
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: maintenance.href }) });
  try {
    const existing = await db.$queryRaw<{ datname: string }[]>`SELECT datname FROM pg_database WHERE datname = 'campustrade_perf'`;
    if (!existing.length) await db.$executeRawUnsafe('CREATE DATABASE "campustrade_perf"');
  } finally { await db.$disconnect(); }
  const childEnv: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: target.href, APP_URL: "https://localhost:3200", NODE_ENV: "development", APPROVED_DOMAINS: "campus.example", BETTER_AUTH_SECRET: "perf-only-local-secret-0123456789abcdef0123456789", MAIL_ADAPTER: "sink", MAIL_SINK_DIR: ".mail-perf", DEV_SEED_PASSWORD: "local-seed-pass-1234", NEXT_DIST_DIR: ".next-perf" };
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { env: childEnv, stdio: "inherit" });
  execFileSync("pnpm", ["exec", "tsx", "scripts/seed.ts"], { env: childEnv, stdio: "inherit" });
  execFileSync("pnpm", ["exec", "tsx", "scripts/perf-seed.ts"], { env: childEnv, stdio: "inherit" });
  const perfDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.href }) });
  const dataset = { registeredUsers: await perfDb.user.count(), credentialAccounts: await perfDb.account.count({ where: { providerId: "credential" } }), listings: await perfDb.listing.count() };
  await perfDb.$disconnect();
  const runtimeEnv: NodeJS.ProcessEnv = { ...childEnv, NODE_ENV: "production", MAIL_ADAPTER: "smtp", SMTP_URL: "smtp://127.0.0.1:2527", SMTP_FROM: "CampusTrade <no-reply@campus.example>" };
  execFileSync("pnpm", ["exec", "next", "build"], { env: runtimeEnv, stdio: "inherit" });
  const smtp = await startTestSmtp(2527, ".mail-perf");
  const proxy = await startTestHttps(3200, 3201);
  const server = spawn("pnpm", ["exec", "next", "start", "--port", "3201"], { env: runtimeEnv, stdio: "ignore", detached: true });
  const stop = () => { try { if (server.pid) process.kill(-server.pid, "SIGTERM"); } catch { /* already exited */ } };
  const terminate = () => { stop(); smtp.close(); proxy.close(); process.exit(130); };
  process.on("SIGTERM", terminate); process.on("SIGINT", terminate);
  const browser = await chromium.launch();
  try {
    const probe = await browser.newContext({ ignoreHTTPSErrors: true });
    let ready = false;
    for (let i = 0; i < 120; i++) {
      try { ready = (await probe.request.get("https://localhost:3200/api/health")).ok(); } catch { /* booting */ }
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    await probe.close();
    if (!ready) throw new Error("Benchmark server did not become ready");
    const paths = ["/listings", "/listings?q=lamp", "/listings?offerType=sale&condition=good", "/listings?minPriceMinor=10000&maxPriceMinor=100000", "/listings?page=50"];
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
      const context = await browser.newContext({ baseURL: "https://localhost:3200", ignoreHTTPSErrors: true });
      const login = await context.request.post("/api/auth/sign-in/email", { headers: { origin: "https://localhost:3200" }, data: { email: `perf.user${i}@campus.example`, password: "local-seed-pass-1234" } });
      if (!login.ok()) throw new Error(`Benchmark sign-in failed: ${login.status()}`);
      const page = await context.newPage();
      for (const path of paths) { await page.goto(path); await page.getByRole("region", { name: "Search results" }).getByRole("status").waitFor(); }
      workers.push({ context, page });
    }
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const samples: { session: number; path: string; ms: number; ok: boolean; error?: string }[] = [];
    const deadline = started + durationSeconds * 1000;
    console.log(`Measuring ${concurrency} authenticated browser sessions for ${durationSeconds}s against ${dataset.registeredUsers} users / ${dataset.listings} listings...`);
    await Promise.all(workers.map(async ({ page }, session) => {
      let iteration = session;
      while (performance.now() < deadline) {
        const path = paths[iteration++ % paths.length];
        const start = performance.now();
        try {
          const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 15000 });
          if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);
          const region = page.getByRole("region", { name: "Search results" });
          await region.getByRole("status").waitFor({ timeout: 15000 });
          await region.locator("li").first().waitFor({ timeout: 15000 });
          samples.push({ session, path, ms: performance.now() - start, ok: true });
        } catch (error) { samples.push({ session, path, ms: performance.now() - start, ok: false, error: error instanceof Error ? error.message : String(error) }); }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }));
    const elapsedSeconds = (performance.now() - started) / 1000;
    const successful = samples.filter(s => s.ok).map(s => s.ms).sort((a, b) => a - b);
    const percentile = (p: number) => successful[Math.min(successful.length - 1, Math.floor(successful.length * p))] ?? null;
    const report = { startedAt, finishedAt: new Date().toISOString(), elapsedSeconds, concurrency, dataset, environment: { node: process.version, browser: browser.version(), platform: os.platform(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryGiB: Math.round(os.totalmem() / 1024 ** 3), server: "Next.js optimized production build, local HTTPS proxy; local PostgreSQL; same machine" }, timing: "Browser navigation initiation to rendered result count and first listing; routes warmed; 1s think time per session", acceptance: "Provisional local profile only; D09 workload not human-approved; no availability claim", summary: { ...assessSearch(samples), p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: percentile(1) }, samples };
    await mkdir("tests/evidence", { recursive: true });
    await writeFile("tests/evidence/performance.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ elapsedSeconds, dataset, ...report.summary }, null, 2));
    if (!report.summary.allWithinFiveSeconds) process.exitCode = 1;
  } finally { await browser.close(); stop(); smtp.close(); proxy.close(); }
}
main().catch(error => { console.error("Benchmark failed:", error); process.exitCode = 1; });
