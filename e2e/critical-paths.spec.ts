import { test, expect } from "@playwright/test";

/**
 * Happy-path smoke coverage for the workflows most affected by the recent
 * stabilization work: timesheets, payslip filtering, paycheck preview, and
 * company details. These run against a live Supabase project, so they only
 * assert on stable UI structure and successful network writes — not on seeded
 * data values.
 */

test.describe("critical payroll paths", () => {
  test("protected routes load without crashing", async ({ page }) => {
    for (const path of [
      "/timesheet",
      "/payslips/overview",
      "/payroll/runs",
      "/settings/company-details",
    ]) {
      const pageErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.goto(path, { waitUntil: "networkidle" });
      expect(page.url(), `should stay on ${path} (not redirected to login)`).not.toContain(
        "/login"
      );
      expect(pageErrors, `no uncaught errors on ${path}`).toEqual([]);
      page.removeAllListeners("pageerror");
    }
  });

  test("payslip search updates the URL and clears", async ({ page }) => {
    await page.goto("/payslips/overview", { waitUntil: "networkidle" });
    await page.getByLabel("Search payslips").fill("KAN003");
    await expect(page).toHaveURL(/search=KAN003/, { timeout: 10_000 });

    await page.getByRole("button", { name: /clear filters/i }).click();
    await expect(page).not.toHaveURL(/search=KAN003/);
  });

  test("paycheck preview renders for an employee", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /preview paycheck/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("#employee-select").click();
    await page.getByRole("option").first().click();

    // Either a calculated preview appears, or a clear tax-tables block message.
    const previewOrBlock = dialog.getByText(
      /gross|net pay|earnings|deductions|tax tables/i
    );
    await expect(previewOrBlock.first()).toBeVisible({ timeout: 20_000 });
  });

  test("company details save is idempotent", async ({ page }) => {
    await page.goto("/settings/company-details", { waitUntil: "networkidle" });
    const email = page.locator("#companyEmail");
    await expect(email).toBeVisible({ timeout: 20_000 });
    const before = await email.inputValue();

    await page.getByRole("button", { name: /save company details/i }).click();
    await page.waitForTimeout(1500);

    await expect(email).toHaveValue(before);
  });

  test("timesheet entry can be added and deleted", async ({ page }) => {
    await page.goto("/timesheet", { waitUntil: "networkidle" });
    const rowsBefore = await page.locator("table tbody tr").count().catch(() => 0);

    await page.getByRole("button", { name: /add entry/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator("#employeeId").click();
    await page.getByRole("option").first().click();
    await page.locator("#timeIn").fill("09:00");
    await page.locator("#timeOut").fill("17:00");
    await page.locator("#lunchStart").fill("13:00");
    await page.locator("#lunchEnd").fill("14:00");

    const createResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/rest/v1/timesheets") &&
        r.request().method() === "POST" &&
        r.ok(),
      { timeout: 20_000 }
    );
    await page.getByRole("button", { name: /record time/i }).click();
    await createResponse;

    await expect(page.locator("table tbody tr")).toHaveCount(rowsBefore + 1, {
      timeout: 15_000,
    });

    const deleteResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/rest/v1/timesheets") &&
        r.request().method() === "DELETE" &&
        r.ok(),
      { timeout: 20_000 }
    );
    await page.getByRole("button", { name: /^delete$/i }).first().click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /^delete$/i })
      .click();
    await deleteResponse;

    await expect(page.locator("table tbody tr")).toHaveCount(rowsBefore, {
      timeout: 15_000,
    });
  });
});
