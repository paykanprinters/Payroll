import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const AUTH_DIR = "e2e/.auth";
const adminAuthFile = path.join(AUTH_DIR, "admin.json");
/** @deprecated Alias kept so older local runs that still point at user.json keep working. */
const legacyAdminAuthFile = path.join(AUTH_DIR, "user.json");
const managerAuthFile = path.join(AUTH_DIR, "manager.json");
const staffAuthFile = path.join(AUTH_DIR, "staff.json");

async function signInConsole(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login", { waitUntil: "networkidle" });
  const form = page.locator("#auth-sign-in");
  await form.locator("#email").fill(email);
  await form.locator("#password").fill(password);
  await form.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/login/);
}

async function signInStaff(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/staff/login", { waitUntil: "networkidle" });
  const form = page.locator("#auth-sign-in");
  await form.locator("#email").fill(email);
  await form.locator("#password").fill(password);
  await form.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
  await expect(page).toHaveURL(/\/staff(?!\/login)/);
}

/**
 * Signs in once per role and stores storageState for dependent projects.
 *
 * Required: E2E_EMAIL / E2E_PASSWORD (Admin).
 * Optional: E2E_MANAGER_* and E2E_STAFF_* (projects skip when unset).
 */
setup("authenticate admin", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    if (fs.existsSync(adminAuthFile) || fs.existsSync(legacyAdminAuthFile)) {
      setup.info().annotations.push({
        type: "notice",
        description: "Reusing existing admin storage state (no credentials set).",
      });
      return;
    }
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD must be set (or provide a pre-seeded e2e/.auth/admin.json)."
    );
  }

  await signInConsole(page, email, password);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: adminAuthFile });
  await page.context().storageState({ path: legacyAdminAuthFile });
});

setup("authenticate manager", async ({ page }) => {
  const email = process.env.E2E_MANAGER_EMAIL;
  const password = process.env.E2E_MANAGER_PASSWORD;

  if (!email || !password) {
    setup.skip(true, "E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD not set");
    return;
  }

  await signInConsole(page, email, password);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: managerAuthFile });
});

setup("authenticate staff", async ({ page }) => {
  const email = process.env.E2E_STAFF_EMAIL;
  const password = process.env.E2E_STAFF_PASSWORD;

  if (!email || !password) {
    setup.skip(true, "E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD not set");
    return;
  }

  await signInStaff(page, email, password);
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: staffAuthFile });
});
