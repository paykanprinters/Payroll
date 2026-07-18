import { test, expect } from "@playwright/test";

/**
 * Manager console smoke after RLS consolidations.
 * Requires E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD (see playwright.config.ts).
 */
test.describe("manager role smoke", () => {
  test("dashboard and core payroll routes load", async ({ page }) => {
    const paths = ["/dashboard", "/employees", "/payroll/runs", "/timesheet", "/payslips/overview", "/vacation-absence"];

    for (const path of paths) {
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.goto(path, { waitUntil: "networkidle" });
      expect(page.url(), `should stay on ${path}`).not.toMatch(/\/(login|unauthorized)/);
      expect(pageErrors, `no uncaught errors on ${path}`).toEqual([]);
      page.removeAllListeners("pageerror");
    }
  });

  test("settings are blocked for managers", async ({ page }) => {
    await page.goto("/settings/company-details", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/unauthorized/);
    await expect(page.locator("#companyEmail")).toHaveCount(0);
  });

  test("payslip search works", async ({ page }) => {
    await page.goto("/payslips/overview", { waitUntil: "networkidle" });
    await page.getByLabel("Search payslips").fill("KAN");
    await expect(page).toHaveURL(/search=KAN/, { timeout: 10_000 });
  });
});
