"use client";

export type SavingsStatus = "arrears" | "paused" | "pending" | "paid";

export interface PayrollSavingsEntry {
  id: string;
  employeeId: string;
  planId: string;
  originalAmount: number;
  overrideAmount?: number | null;
  /** Last day the override replaces the plan deduction. Blank means it stays until cleared. */
  overrideEndDate?: string | null;
  /** Total the employee is saving toward. The weekly or monthly deduction stays on the plan. */
  goalAmount?: number | null;
  /** Money already saved before this system started taking deductions. */
  openingBalance?: number;
  amountPaid: number;
  remainingBalance: number | null; // generated in DB from the goal
  status: SavingsStatus;
  paused: boolean;
  pauseStartDate?: string | null; // yyyy-MM-dd
  nextPaymentDate?: string | null; // yyyy-MM-dd
  pauseReason?: string | null;
  lastUpdated: string; // ISO
  createdAt: string; // ISO
}

export interface SavingsPayment {
  id: string;
  planId: string;
  employeeId: string;
  amount: number;
  payPeriod: string;
  entryType: "payment" | "withdrawal";
  createdAt: string;
}

export function localDateString(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Amount payroll deducts for one period.
 * An override replaces the plan amount. It is not added to it.
 * A pay period that starts after the override end date uses the plan amount again.
 */
export function savingsDeductionBase(
  planAmount: number,
  entry: Pick<PayrollSavingsEntry, "originalAmount" | "overrideAmount" | "overrideEndDate"> | null,
  periodStart: string
): number {
  if (!entry) return planAmount;
  const planDeduction = Number.isFinite(entry.originalAmount) ? entry.originalAmount : planAmount;
  if (entry.overrideAmount == null) return planDeduction;
  if (entry.overrideEndDate && periodStart.slice(0, 10) > entry.overrideEndDate.slice(0, 10)) {
    return planDeduction;
  }
  return entry.overrideAmount;
}

/** The end date is the last day the plan still collects. The next day it is finished. */
export function savingsScheduleFinished(endDate: string | null | undefined, today = localDateString()): boolean {
  if (!endDate) return false;
  return endDate.slice(0, 10) < today;
}

export const statusColorMap: Record<SavingsStatus, string> = {
  arrears: "bg-red-100 text-red-700 border-red-200",
  paused: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-green-100 text-green-700 border-green-200",
};

export function updateStatusClient(
  entry: PayrollSavingsEntry,
  schedule?: { endDate?: string | null; today?: string }
): SavingsStatus {
  // Optional auto-unpause: if nextPaymentDate reached, clear paused
  if (entry.paused && entry.nextPaymentDate) {
    const now = new Date();
    const next = new Date(entry.nextPaymentDate);
    if (!isNaN(next.getTime()) && next <= now) {
      entry.paused = false;
    }
  }

  const today = schedule?.today ?? localDateString();
  const goal = entry.goalAmount;
  const goalReached = goal != null && goal > 0 && entry.amountPaid >= goal;
  const scheduleFinished = savingsScheduleFinished(schedule?.endDate, today);
  if (goalReached || scheduleFinished) {
    entry.status = "paid";
    entry.paused = false;
  } else if (entry.paused) {
    entry.status = "paused";
  } else {
    entry.status = "pending";
  }
  return entry.status;
}

export function savingsTrackingStatus(
  entry: PayrollSavingsEntry,
  endDate?: string | null,
  today?: string
): SavingsStatus {
  return updateStatusClient({ ...entry }, { endDate, today });
}
