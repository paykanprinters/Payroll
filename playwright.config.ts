import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

/**
 * End-to-end tests for critical payroll workflows and role smokes.
 *
 * Auth setup writes storage state under e2e/.auth/:
 * - admin.json (from E2E_EMAIL / E2E_PASSWORD)
 * - manager.json (optional E2E_MANAGER_*)
 * - staff.json (optional E2E_STAFF_*)
 *
 * See `.env.e2e.example`.
 */
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:8080";
const hasManagerCreds = Boolean(process.env.E2E_MANAGER_EMAIL && process.env.E2E_MANAGER_PASSWORD);
const hasStaffCreds = Boolean(process.env.E2E_STAFF_EMAIL && process.env.E2E_STAFF_PASSWORD);

const projects: import("@playwright/test").Project[] = [
  {
    name: "setup",
    testMatch: /auth\.setup\.ts/,
  },
  {
    name: "admin",
    testMatch: /critical-paths\.spec\.ts|payroll-hardening\.spec\.ts/,
    use: {
      ...devices["Desktop Chrome"],
      storageState: fs.existsSync("e2e/.auth/admin.json")
        ? "e2e/.auth/admin.json"
        : "e2e/.auth/user.json",
    },
    dependencies: ["setup"],
  },
];

if (hasManagerCreds) {
  projects.push({
    name: "manager",
    testMatch: /manager-smoke\.spec\.ts/,
    use: {
      ...devices["Desktop Chrome"],
      storageState: "e2e/.auth/manager.json",
    },
    dependencies: ["setup"],
  });
}

if (hasStaffCreds) {
  projects.push({
    name: "staff",
    testMatch: /staff-smoke\.spec\.ts/,
    use: {
      ...devices["Desktop Chrome"],
      storageState: "e2e/.auth/staff.json",
    },
    dependencies: ["setup"],
  });
}

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
  projects,
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 8080",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
