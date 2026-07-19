import { test, expect } from "@playwright/test";

/**
 * Hardening Phase 5 smoke: readiness report, exceptions filters, biometric settings.
 * Avoids live biometric clock calls (no "Test connection").
 */
test.describe("payroll hardening smoke", () => {
  test("payroll readiness report opens from Reports", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto("/reports", { waitUntil: "networkidle" });
    expect(page.url()).not.toContain("/login");

    await page.getByLabel("Search reports").fill("readiness");
    const readinessCard = page.getByRole("heading", { name: /payroll readiness/i });
    await expect(readinessCard).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: /preview & export/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/payroll readiness/i)).toBeVisible();
    await expect(dialog.getByText(/page orientation/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("exceptions dashboard period and severity chips work", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto("/payroll/exceptions", { waitUntil: "networkidle" });
    expect(page.url()).not.toMatch(/\/(login|unauthorized)/);

    await expect(page.getByRole("heading", { name: /exceptions dashboard/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel(/payroll month/i)).toBeVisible();

    await page.getByRole("button", { name: /^absent$/i }).click();
    await expect(page.getByRole("button", { name: /^absent$/i })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: /clear filters/i }).click();
    await expect(page.getByRole("button", { name: /^absent$/i })).toHaveAttribute("aria-pressed", "false");

    expect(pageErrors).toEqual([]);
  });

  test("biometric settings page loads without testing the clock", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto("/settings/biometric-api", { waitUntil: "networkidle" });
    expect(page.url()).not.toMatch(/\/(login|unauthorized)/);

    await expect(page.locator("#biometric-api-url")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /test connection/i })).toBeVisible();
    // Do not click Test connection — avoids live clock dependency.

    expect(pageErrors).toEqual([]);
  });

  test("payroll run detail shows readiness section when present", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await page.goto("/payroll/runs", { waitUntil: "networkidle" });
    expect(page.url()).not.toContain("/login");

    const openLink = page.getByRole("link", { name: /open|view|detail/i }).first();
    const rowLink = page.locator('a[href*="/payroll/runs/"]').first();
    const target = (await openLink.count()) > 0 ? openLink : rowLink;

    if ((await target.count()) === 0) {
      test.skip(true, "No payroll runs available to open in this environment");
      return;
    }

    await target.click();
    await page.waitForURL(/\/payroll\/runs\//, { timeout: 15_000 });

    // Soft coverage: Submitted timesheet gate copy when blockers exist, otherwise readiness chrome.
    const submittedBlocker = page.getByText(/submitted timesheet/i);
    const readinessChrome = page.getByText(/readiness|blocker/i);
    await expect(submittedBlocker.or(readinessChrome).first()).toBeVisible({ timeout: 20_000 });

    expect(pageErrors).toEqual([]);
  });
});
