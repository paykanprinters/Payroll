import { describe, it, expect } from "vitest";
import {
  buildStaffSavingsSummary,
  normalizeSavingsDeductionPerPayPeriod,
} from "@/lib/staff-savings-summary";
import type { MockEmployee, MockPayslip, SavingPlan } from "@/lib/mock-data-interfaces";
import type { PayrollSavingsEntry } from "@/lib/savings-types";

const employee = {
  id: "emp-1",
  payFrequency: "Monthly",
} as MockEmployee;

describe("normalizeSavingsDeductionPerPayPeriod", () => {
  it("matches monthly plan to monthly pay", () => {
    expect(normalizeSavingsDeductionPerPayPeriod(500, "monthly", "Monthly")).toBe(500);
  });

  it("converts weekly plan to monthly pay (x4)", () => {
    expect(normalizeSavingsDeductionPerPayPeriod(100, "weekly", "Monthly")).toBe(400);
  });

  it("converts weekly plan to bi-weekly pay (x2)", () => {
    expect(normalizeSavingsDeductionPerPayPeriod(100, "weekly", "Bi-Weekly")).toBe(200);
  });
});

describe("buildStaffSavingsSummary", () => {
  const plans: SavingPlan[] = [
    {
      id: "plan-1",
      employeeId: "emp-1",
      amount: 250,
      frequency: "monthly",
      startDate: "2026-01-01",
      status: "active",
    },
    {
      id: "plan-2",
      employeeId: "emp-1",
      amount: 50,
      frequency: "weekly",
      startDate: "2026-02-01",
      endDate: "2026-12-31",
      status: "active",
    },
  ];

  const entries: PayrollSavingsEntry[] = [
    {
      id: "entry-1",
      employeeId: "emp-1",
      planId: "plan-1",
      originalAmount: 250,
      overrideAmount: null,
      amountPaid: 750,
      remainingBalance: 0,
      status: "pending",
      paused: false,
      lastUpdated: "2026-03-01T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "entry-2",
      employeeId: "emp-1",
      planId: "plan-2",
      originalAmount: 50,
      overrideAmount: null,
      amountPaid: 0,
      remainingBalance: 200,
      status: "paused",
      paused: true,
      pauseReason: "Leave",
      lastUpdated: "2026-03-01T00:00:00Z",
      createdAt: "2026-02-01T00:00:00Z",
    },
  ];

  it("aggregates saved amounts and per-paycheck deductions", () => {
    const summary = buildStaffSavingsSummary(employee, plans, entries, []);
    expect(summary.activePlanCount).toBe(2);
    expect(summary.pausedPlanCount).toBe(1);
    expect(summary.totalSaved).toBe(750);
    expect(summary.perPaycheckDeductions).toBe(250);
  });

  it("falls back to payslip deductions when entries have no payments recorded", () => {
    const payslips = [
      {
        id: "ps-1",
        employeeId: "emp-1",
        payPeriod: "2026-03",
        payDate: "2026-03-31",
        deductionsBreakdown: [{ name: "Savings", amount: 300 }],
      } as MockPayslip,
    ];

    const summary = buildStaffSavingsSummary(employee, plans, [], payslips);
    expect(summary.totalSaved).toBe(300);
    expect(summary.recentDeductions).toHaveLength(1);
  });
});
