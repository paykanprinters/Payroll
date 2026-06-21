import { describe, it, expect } from "vitest";
import { buildAdminSavingsSummary } from "@/lib/savings-admin-summary";
import type { SavingPlan } from "@/lib/mock-data-interfaces";
import type { PayrollSavingsEntry } from "@/lib/savings-types";

describe("buildAdminSavingsSummary", () => {
  const plans: SavingPlan[] = [
    {
      id: "plan-1",
      employeeId: "emp-1",
      amount: 500,
      frequency: "monthly",
      startDate: "2026-01-01",
      status: "active",
    },
    {
      id: "plan-2",
      employeeId: "emp-2",
      amount: 100,
      frequency: "weekly",
      startDate: "2026-02-01",
      status: "active",
    },
    {
      id: "plan-3",
      employeeId: "emp-3",
      amount: 200,
      frequency: "monthly",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      status: "completed",
    },
  ];

  const entries: PayrollSavingsEntry[] = [
    {
      id: "entry-1",
      employeeId: "emp-1",
      planId: "plan-1",
      originalAmount: 500,
      overrideAmount: null,
      amountPaid: 1500,
      remainingBalance: 0,
      status: "pending",
      paused: false,
      lastUpdated: "2026-03-01T00:00:00Z",
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "entry-2",
      employeeId: "emp-2",
      planId: "plan-2",
      originalAmount: 100,
      overrideAmount: null,
      amountPaid: 400,
      remainingBalance: 600,
      status: "paused",
      paused: true,
      lastUpdated: "2026-03-01T00:00:00Z",
      createdAt: "2026-02-01T00:00:00Z",
    },
  ];

  it("aggregates saved and remaining balances from entries", () => {
    const summary = buildAdminSavingsSummary(plans, entries);
    expect(summary.totalSaved).toBe(1900);
    expect(summary.totalRemaining).toBe(600);
    expect(summary.activePlanCount).toBe(2);
    expect(summary.pausedPlanCount).toBe(1);
    expect(summary.completedPlanCount).toBe(1);
  });

  it("sums only non-paused active plan amounts for scheduled exposure", () => {
    const summary = buildAdminSavingsSummary(plans, entries);
    expect(summary.activeScheduledAmount).toBe(500);
  });
});
