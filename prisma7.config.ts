// Prisma 7 configuration (Prisma 7.10+ uses prisma7.config.ts for the Prisma 7 CLI;
// see https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql).
// Prisma 7 no longer loads .env automatically; load it via Node's built-in
// process.loadEnvFile (no dotenv dependency) when present.
try {
  process.loadEnvFile();
} catch {
  // .env absent (e.g. CI or explicit environment) - rely on real env vars.
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
