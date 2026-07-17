import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = "e2e/.auth/user.json";

/**
 * Signs in once and stores the authenticated session for the other projects.
 *
 * Set E2E_EMAIL and E2E_PASSWORD (an admin account) in the environment. If a
 * valid stored session already exists and no credentials are provided, the
 * existing session is reused so local runs don't require re-entering secrets.
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    if (fs.existsSync(authFile)) {
      setup.info().annotations.push({
        type: "notice",
        description: "Reusing existing e2e/.auth/user.json (no credentials set).",
      });
      return;
    }
    throw new Error(
      "E2E_EMAIL and E2E_PASSWORD must be set (or provide a pre-seeded e2e/.auth/user.json)."
    );
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  await expect(page).not.toHaveURL(/\/login/);
});
