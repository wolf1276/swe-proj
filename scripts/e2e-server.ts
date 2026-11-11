import { startTestHttps, startTestSmtp } from "./local-test-services";
import { spawn, execFileSync } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertTestDatabase } from "./test-database";

async function main() {
try { process.loadEnvFile(); } catch { /* CI may supply all variables. */ }
const appDatabase = process.env.DATABASE_URL;
const target = new URL(process.env.E2E_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? "");
target.pathname = "/campustrade_e2e";
assertTestDatabase(target.href, appDatabase);
const maintenance = new URL(target);
maintenance.pathname = "/postgres";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: maintenance.href }) });
try {
  const existing = await db.$queryRaw<{ datname: string }[]>`SELECT datname FROM pg_database WHERE datname = 'campustrade_e2e'`;
  if (!existing.length) await db.$executeRawUnsafe('CREATE DATABASE "campustrade_e2e"');
} finally { await db.$disconnect(); }
const childEnv: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: target.href,
  NODE_ENV: "development",
  APP_URL: "https://localhost:3100",
  APPROVED_DOMAINS: "campus.example",
  BETTER_AUTH_SECRET: "e2e-local-only-secret-0123456789abcdef0123456789",
  MAIL_ADAPTER: "sink",
  MAIL_SINK_DIR: ".mail-e2e",
  DEV_SEED_PASSWORD: "local-seed-pass-1234",
  NEXT_DIST_DIR: ".next-e2e",
};
execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], { env: childEnv, stdio: "inherit" });
execFileSync("pnpm", ["exec", "tsx", "scripts/seed.ts"], { env: childEnv, stdio: "inherit" });
const smtp = await startTestSmtp(2526, ".mail-e2e");
const proxy = await startTestHttps(3100, 3101);
const runtimeEnv: NodeJS.ProcessEnv = { ...childEnv, NODE_ENV: "production", MAIL_ADAPTER: "smtp", SMTP_URL: "smtp://127.0.0.1:2526", SMTP_FROM: "CampusTrade <no-reply@campus.example>" };
execFileSync("pnpm", ["exec", "next", "build"], { env: runtimeEnv, stdio: "inherit" });
const server = spawn("pnpm", ["exec", "next", "start", "--port", "3101"], { env: runtimeEnv, stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"] as const) process.on(signal, () => { server.kill(signal); smtp.close(); proxy.close(); });
server.on("exit", (code) => { smtp.close(); proxy.close(); process.exitCode = code ?? 0; });
}
main().catch(error => { console.error(error); process.exit(1); });
