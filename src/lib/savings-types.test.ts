import { describe, expect, it } from "vitest";
import { PayrollSavingsEntry, savingsDeductionBase, savingsSavedToDate, updateStatusClient } from "@/lib/savings-types";

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

describe("savingsSavedToDate", () => {
  it("adds this period's deduction to the amount already saved", () => {
    expect(savingsSavedToDate([entry({ amountPaid: 3500 })], "emp-1", 250)).toBe(3750);
  });

  it("ignores another employee's balance", () => {
    expect(savingsSavedToDate([entry({ employeeId: "emp-2", amountPaid: 3500 })], "emp-1", 150)).toBe(150);
  });

  it("returns null when nothing has been saved and nothing is deducted", () => {
    expect(savingsSavedToDate([entry({ amountPaid: 0 })], "emp-1", 0)).toBeNull();
  });

  it("does not add this week again when the balance already includes it", () => {
    expect(savingsSavedToDate([entry({ amountPaid: 3750 })], "emp-1", 250, true)).toBe(3750);
  });
});

describe("savingsDeductionBase", () => {
  const entry = {
    originalAmount: 250,
    overrideAmount: 100,
    overrideEndDate: "2026-10-31",
  };

  it("replaces the plan deduction and does not add the override to it", () => {
    expect(savingsDeductionBase(250, entry, "2026-10-06")).toBe(100);
  });

  it("uses the plan deduction once the pay period starts after the override end date", () => {
    expect(savingsDeductionBase(250, entry, "2026-11-02")).toBe(250);
  });

  it("keeps the override on a pay period that starts on the end date", () => {
    expect(savingsDeductionBase(250, entry, "2026-10-31")).toBe(100);
  });
});

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

  it("stays pending on the end date when no goal has been reached", () => {
    const row = entry({ amountPaid: 0 });
    expect(updateStatusClient(row, { endDate: "2026-12-15", today: "2026-12-15" })).toBe("pending");
  });

  it("turns paid the day after the end date even when no goal is set", () => {
    const row = entry({ amountPaid: 0 });
    expect(updateStatusClient(row, { endDate: "2026-12-15", today: "2026-12-16" })).toBe("paid");
  });

  it("stays pending for an open-ended plan with no goal", () => {
    const row = entry({ amountPaid: 500 });
    expect(updateStatusClient(row, { endDate: null, today: "2026-12-16" })).toBe("pending");
  });
});
