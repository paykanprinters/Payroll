import { describe, it, expect } from "vitest";
import {
  buildDashboardAdminSummary,
  filterPayslipsByChartPeriod,
  computeSetupReadyCount,
} from "@/lib/dashboard-admin-summary";
import type { MockPayslip, TimesheetEntry } from "@/lib/mock-data-interfaces";

describe("filterPayslipsByChartPeriod", () => {
  it("returns all payslips when period is all", () => {
    const payslips = [{ id: "1", payPeriod: "2020-01-01 - 2020-01-31" }] as MockPayslip[];
    expect(filterPayslipsByChartPeriod(payslips, "all")).toHaveLength(1);
  });
});

describe("computeSetupReadyCount", () => {
  it("counts ready setup areas", () => {
    expect(
      computeSetupReadyCount({
        companyDetails: { companyLegalName: "Acme" } as never,
        payCycleSettings: { payCycleType: "Monthly" } as never,
        userTaxSettings: { applyPaye: false } as never,
        taxTables: null,
      })
    ).toBe(3);
  });

  it("requires validated tax tables when PAYE applies", () => {
    expect(
      computeSetupReadyCount({
        companyDetails: { companyLegalName: "Acme", companyTaxNumber: "123" } as never,
        payCycleSettings: { payCycleType: "Monthly" } as never,
        userTaxSettings: { applyPaye: true } as never,
        taxTables: null,
        activeTaxYearForCalculations: 2027,
      })
    ).toBe(2);
  });
  it("requires validated tax tables when PAYE applies", () => {
    expect(
      computeSetupReadyCount({
        companyDetails: { companyLegalName: "Acme", companyTaxNumber: "123" } as never,
        payCycleSettings: { payCycleType: "Monthly" } as never,
        userTaxSettings: { applyPaye: true } as never,
        taxTables: null,
        activeTaxYearForCalculations: 2027,
      })
    ).toBe(2);
  });
});

describe("buildDashboardAdminSummary", () => {
  it("summarizes operational dashboard metrics", () => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const summary = buildDashboardAdminSummary({
      employeeCount: 5,
      payslips: [
        {
          id: "p1",
          payPeriod: `${monthKey}-01 - ${monthKey}-28`,
          grossEarnings: 10000,
        } as MockPayslip,
      ],
      pendingTodoCount: 2,
      timesheets: [
        { status: "Draft" },
        { status: "Approved" },
        { status: "Submitted" },
      ] as TimesheetEntry[],
      companyDetails: { companyLegalName: "Acme" } as never,
      payCycleSettings: { payCycleType: "Monthly" } as never,
      userTaxSettings: { applyPaye: false } as never,
      taxTables: null,
    });

    expect(summary.employeeCount).toBe(5);
    expect(summary.payslipCount).toBe(1);
    expect(summary.pendingTodoCount).toBe(2);
    expect(summary.timesheetsAwaitingAction).toBe(2);
    expect(summary.currentMonthGrossPayroll).toBe(10000);
    expect(summary.setupReadyCount).toBe(3);
  });
});
