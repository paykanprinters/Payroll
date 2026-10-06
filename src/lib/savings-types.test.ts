import { describe, expect, it } from "vitest";
import { PayrollSavingsEntry, updateStatusClient } from "@/lib/savings-types";

function entry(partial: Partial<PayrollSavingsEntry>): PayrollSavingsEntry {
  return {
    id: "entry-1",
    employeeId: "emp-1",
    planId: "plan-1",
    originalAmount: 250,
    overrideAmount: null,
    goalAmount: null,
    amountPaid: 0,
    remainingBalance: null,
    status: "pending",
    paused: false,
    lastUpdated: "2026-06-24T00:00:00Z",
    createdAt: "2026-06-24T00:00:00Z",
    ...partial,
  };
}

describe("updateStatusClient", () => {
  it("stays pending when payments only cover the weekly deduction and no goal is set", () => {
    const row = entry({ amountPaid: 250 });
    expect(updateStatusClient(row)).toBe("pending");
  });

  it("stays pending until recorded payments reach the goal", () => {
    const row = entry({ goalAmount: 1000, amountPaid: 250 });
    expect(updateStatusClient(row)).toBe("pending");
  });

  it("becomes paid when recorded payments reach the goal", () => {
    const row = entry({ goalAmount: 1000, amountPaid: 1000 });
    expect(updateStatusClient(row)).toBe("paid");
    expect(row.paused).toBe(false);
  });

  it("uses paused while the goal has not been reached", () => {
    const row = entry({ goalAmount: 1000, amountPaid: 250, paused: true });
    expect(updateStatusClient(row)).toBe("paused");
  });
});
