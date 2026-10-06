"use client";

export type SavingsStatus = "arrears" | "paused" | "pending" | "paid";

export interface PayrollSavingsEntry {
  id: string;
  employeeId: string;
  planId: string;
  originalAmount: number;
  overrideAmount?: number | null;
  /** Total the employee is saving toward. The weekly or monthly deduction stays on the plan. */
  goalAmount?: number | null;
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
  createdAt: string;
}

export const statusColorMap: Record<SavingsStatus, string> = {
  arrears: "bg-red-100 text-red-700 border-red-200",
  paused: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-green-100 text-green-700 border-green-200",
};

export function updateStatusClient(entry: PayrollSavingsEntry): SavingsStatus {
  // Optional auto-unpause: if nextPaymentDate reached, clear paused
  if (entry.paused && entry.nextPaymentDate) {
    const now = new Date();
    const next = new Date(entry.nextPaymentDate);
    if (!isNaN(next.getTime()) && next <= now) {
      entry.paused = false;
    }
  }

  const goal = entry.goalAmount;
  if (goal != null && goal > 0 && entry.amountPaid >= goal) {
    entry.status = "paid";
    entry.paused = false;
  } else if (entry.paused) {
    entry.status = "paused";
  } else {
    entry.status = "pending";
  }
  return entry.status;
}