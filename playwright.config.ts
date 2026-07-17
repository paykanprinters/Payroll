import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the critical payroll workflows.
 *
 * Auth: `e2e/auth.setup.ts` signs in once with the E2E_EMAIL / E2E_PASSWORD
 * credentials and stores the session in `e2e/.auth/user.json`, which the
 * `chromium` project reuses. Provide those env vars (see `.env.e2e.example`).
 */
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:8080";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  // Reuse an already-running dev server if present; otherwise start one.
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 8080",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
