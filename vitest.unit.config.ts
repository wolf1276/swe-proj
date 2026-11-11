import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit test configuration.
 *
 * Unit tests exercise pure domain logic (validation, money, eligibility,
 * CSRF/HTTP guards) without a database. Environment variables provide the
 * minimal configuration required to import application modules; no
 * connection is made to any database at this level.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://campustrade:campustrade-local-dev@localhost:5432/campustrade_test?schema=public",
      APP_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "unit-test-secret-0123456789abcdef0123456789",
      APPROVED_DOMAINS: "campus.example",
      MAIL_ADAPTER: "sink",
      MAIL_SINK_DIR: ".mailsink-test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
