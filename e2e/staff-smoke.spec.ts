import { test, expect } from "@playwright/test";

/**
 * Staff portal smoke after RLS consolidations.
 * Requires E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD (see playwright.config.ts).
 */
test.describe("staff portal smoke", () => {
  test("staff home and self-service routes load", async ({ page }) => {
    const paths = [
      "/staff",
      "/staff/payslips",
      "/staff/leave",
      "/staff/savings",
      "/staff/loans",
      "/staff/profile",
      "/staff/privacy",
    ];

    for (const path of paths) {
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.goto(path, { waitUntil: "networkidle" });
      expect(page.url(), `should stay in staff portal for ${path}`).toMatch(/\/staff/);
      expect(page.url(), `should not bounce to login for ${path}`).not.toMatch(/\/staff\/login/);
      expect(pageErrors, `no uncaught errors on ${path}`).toEqual([]);
      page.removeAllListeners("pageerror");
    }
  });

  test("admin console routes redirect staff away", async ({ page }) => {
    await page.goto("/employees", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/staff|\/unauthorized|\/login/);
    await expect(page).not.toHaveURL(/\/employees$/);
  });

  test("unauthenticated staff path requires login", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto("/staff", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/staff\/login/);
    await context.close();
  });
});
