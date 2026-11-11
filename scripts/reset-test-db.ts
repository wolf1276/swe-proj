/**
 * Resets the isolated integration-test database (campustrade_test).
 * Integration tests truncate data between decision-table cases instead of
 * dropping the schema, so this script only needs to prepare a clean schema
 * once per run.
 *
 * Usage: pnpm reset-test-db  (tsx scripts/reset-test-db.ts)
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { assertTestDatabase } from "./test-database";
import { execSync } from "node:child_process";

async function main() {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) {
    throw new Error("TEST_DATABASE_URL must point at the isolated campustrade_test database");
  }
  assertTestDatabase(url, process.env.DATABASE_URL);
  // Apply migrations with the test connection string.
  execSync(
    `pnpm exec prisma migrate deploy`,
    {
      env: { ...process.env, DATABASE_URL: url },
      stdio: "inherit",
    }
  );
  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });
  try {
    const counts = {
      users: await prisma.user.count(),
      listings: await prisma.listing.count(),
    };
    console.log("Test database ready:", counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Test database reset failed:", error);
  process.exitCode = 1;
});
