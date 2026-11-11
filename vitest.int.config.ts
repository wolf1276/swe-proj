import { defineConfig } from "vitest/config";
import path from "node:path";
import { assertTestDatabase } from "./scripts/test-database";

/**
 * Integration test configuration.
 *
 * Integration tests run against the isolated campustrade_test database
 * (TEST_DATABASE_URL in .env; prepared by `pnpm test:int` via
 * scripts/reset-test-db.ts). The application modules are pointed at the
 * test database by overriding DATABASE_URL for the test workers.
 */
try { process.loadEnvFile(); } catch { /* Explicit CI env is supported. */ }
const dotenv = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? dotenv["TEST_DATABASE_URL"];

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set (in .env) for integration tests; run `pnpm test:int`"
  );
}

assertTestDatabase(testDatabaseUrl, process.env.DATABASE_URL);

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    env: {
      ...dotenv,
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      // Keep integration-test mail out of the development mailbox directory.
      MAIL_SINK_DIR: ".mailsink-test",
    },
    // Integration suites share one schema; run files serially to avoid
    // cross-file data races (each file truncates and reseeds as needed).
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
