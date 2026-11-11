import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "tests/evidence/e2e-results.json" }]],
  use: { baseURL: "https://localhost:3100", ignoreHTTPSErrors: true, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }, { name: "firefox", use: { ...devices["Desktop Firefox"] } }],
  webServer: { command: "pnpm exec tsx scripts/e2e-server.ts", url: "https://localhost:3100/api/health", reuseExistingServer: false, ignoreHTTPSErrors: true, timeout: 120000 },
});
