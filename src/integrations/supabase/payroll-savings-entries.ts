"use client";

import { supabase } from "@/integrations/supabase/client";
import { isRecord, type UnknownRecord } from "@/lib/case-converters";
import { PayrollSavingsEntry, SavingsPayment, SavingsStatus, updateStatusClient } from "@/lib/savings-types";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

// snake <-> camel helpers
const toCamel = (value: unknown): PayrollSavingsEntry => {
  if (!isRecord(value)) {
    throw new TypeError("Expected a payroll savings entry row.");
  }

  const row = value as UnknownRecord;
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    planId: row.plan_id as string,
    originalAmount: Number(row.original_amount),
    overrideAmount: row.override_amount !== null ? Number(row.override_amount) : null,
    goalAmount: row.goal_amount != null ? Number(row.goal_amount) : null,
    openingBalance: row.opening_balance != null ? Number(row.opening_balance) : 0,
    amountPaid: Number(row.amount_paid),
    remainingBalance: row.remaining_balance != null ? Number(row.remaining_balance) : null,
    status: row.status as SavingsStatus,
    paused: !!row.paused,
    pauseStartDate: row.pause_start_date as string | null,
    nextPaymentDate: row.next_payment_date as string | null,
    pauseReason: row.pause_reason as string | null,
    lastUpdated: row.last_updated as string,
    createdAt: row.created_at as string,
  };
};

const toSnake = (partial: Partial<PayrollSavingsEntry>): UnknownRecord => {
  const out: UnknownRecord = {};
  if ("id" in partial) out.id = partial.id;
  if ("employeeId" in partial) out.employee_id = partial.employeeId;
  if ("planId" in partial) out.plan_id = partial.planId;
  if ("originalAmount" in partial) out.original_amount = partial.originalAmount;
  if ("overrideAmount" in partial) out.override_amount = partial.overrideAmount ?? null;
  if ("goalAmount" in partial) out.goal_amount = partial.goalAmount ?? null;
  if ("openingBalance" in partial) out.opening_balance = partial.openingBalance ?? 0;
  if ("amountPaid" in partial) out.amount_paid = partial.amountPaid;
  if ("status" in partial) out.status = partial.status;
  if ("paused" in partial) out.paused = partial.paused;
  if ("pauseStartDate" in partial) out.pause_start_date = partial.pauseStartDate ?? null;
  if ("nextPaymentDate" in partial) out.next_payment_date = partial.nextPaymentDate ?? null;
  if ("pauseReason" in partial) out.pause_reason = partial.pauseReason ?? null;
  return out;
};

export async function getEntryByPlanId(planId: string): Promise<PayrollSavingsEntry | null> {
  const { data, error } = await supabase
    .from("payroll_savings_entries")
    .select("*")
    .eq("plan_id", planId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    logger.error("getEntryByPlanId error:", toLogError(error));
    showError("Failed to load savings entry.");
    return null;
  }
  return data ? toCamel(data) : null;
}

export async function upsertEntry(partial: Partial<PayrollSavingsEntry>): Promise<PayrollSavingsEntry | null> {
  const payload = toSnake(partial);
  const { data, error } = await supabase
    .from("payroll_savings_entries")
    .upsert(payload, { onConflict: "plan_id" })
    .select()
    .maybeSingle();

  if (error) {
    logger.error("upsertEntry error:", toLogError(error));
    showError("Failed to save savings entry.");
    return null;
  }
  return data ? toCamel(data) : null;
}

export async function setOverrideAmount(planId: string, overrideAmount: number | null): Promise<PayrollSavingsEntry | null> {
  // Fetch current, compute status based on new override
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const next = { ...current, overrideAmount };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  const updated = await upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    overrideAmount,
    status: next.status,
    paused: next.paused,
  });
  return updated;
}

async function endDateForPlan(planId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("saving_plans")
    .select("end_date")
    .eq("id", planId)
    .maybeSingle();
  if (error) {
    logger.error("endDateForPlan error:", toLogError(error));
    return null;
  }
  return (data?.end_date as string | null) ?? null;
}

export async function setGoalAmount(planId: string, goalAmount: number | null): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const next = { ...current, goalAmount };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  return upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    goalAmount,
    status: next.status,
    paused: next.paused,
  });
}

export async function syncDeductionAmount(planId: string, amount: number): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  return upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    originalAmount: amount,
  });
}

export async function listPaymentsForPlan(planId: string): Promise<SavingsPayment[]> {
  const { data, error } = await supabase
    .from("payroll_savings_payments")
    .select("*")
    .eq("plan_id", planId)
    .order("pay_period", { ascending: false });

  if (error) {
    logger.error("listPaymentsForPlan error:", toLogError(error));
    showError("Failed to load savings payments.");
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    planId: row.plan_id as string,
    employeeId: row.employee_id as string,
    amount: Number(row.amount),
    payPeriod: row.pay_period as string,
    entryType: row.entry_type === "withdrawal" ? "withdrawal" : "payment",
    createdAt: row.created_at as string,
  }));
}

export async function recordPayment(
  planId: string,
  amount: number,
  payPeriod?: string | null
): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;

  if (payPeriod) {
    const { error } = await supabase.from("payroll_savings_payments").insert({
      plan_id: planId,
      employee_id: current.employeeId,
      amount,
      pay_period: payPeriod,
      entry_type: "payment",
    });
    if (error) {
      logger.error("recordPayment history error:", toLogError(error));
      showError("Failed to record the savings payment.");
      return null;
    }
  }

  const next = { ...current, amountPaid: Math.max(0, current.amountPaid + amount) };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  const updated = await upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    amountPaid: next.amountPaid,
    status: next.status,
    paused: next.paused,
  });
  return updated;
}

export async function pauseEntry(planId: string, reason: string | null, nextPaymentDate: string | null): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const next = {
    ...current,
    paused: true,
    pauseReason: reason ?? null,
    pauseStartDate: new Date().toISOString().slice(0, 10),
    nextPaymentDate,
  };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  const updated = await upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    paused: true,
    pauseReason: next.pauseReason ?? null,
    pauseStartDate: next.pauseStartDate!,
    nextPaymentDate: nextPaymentDate ?? null,
    status: next.status,
  });
  return updated;
}

export async function unpauseEntry(planId: string): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const next = { ...current, paused: false };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  const updated = await upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    paused: false,
    status: next.status,
  });
  return updated;
}

export async function setOpeningBalance(planId: string, openingBalance: number): Promise<PayrollSavingsEntry | null> {
  if (isNaN(openingBalance) || openingBalance < 0) {
    showError("Already saved must be zero or more.");
    return null;
  }
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const previous = current.openingBalance ?? 0;
  const next = {
    ...current,
    openingBalance,
    amountPaid: Math.max(0, current.amountPaid - previous + openingBalance),
  };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  return upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    openingBalance,
    amountPaid: next.amountPaid,
    status: next.status,
    paused: next.paused,
  });
}

export async function recordWithdrawal(
  planId: string,
  amount: number,
  payPeriod: string
): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  if (!(amount > 0)) {
    showError("Enter a withdrawal amount greater than 0.");
    return null;
  }
  if (Math.round(amount * 100) > Math.round(current.amountPaid * 100)) {
    showError("Withdrawal cannot be more than the saved balance.");
    return null;
  }

  const { error } = await supabase.from("payroll_savings_payments").insert({
    plan_id: planId,
    employee_id: current.employeeId,
    amount,
    pay_period: payPeriod,
    entry_type: "withdrawal",
  });
  if (error) {
    logger.error("recordWithdrawal error:", toLogError(error));
    showError("Failed to record the withdrawal.");
    return null;
  }

  const next = { ...current, amountPaid: Math.max(0, current.amountPaid - amount) };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  return upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    amountPaid: next.amountPaid,
    status: next.status,
    paused: next.paused,
  });
}

export async function refreshTrackingStatus(planId: string): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const next = { ...current };
  updateStatusClient(next, { endDate: await endDateForPlan(planId) });
  if (next.status === current.status && next.paused === current.paused) return next;
  return upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    status: next.status,
    paused: next.paused,
  });
}

export async function ensureEntryForPlan(plan: { id: string; employeeId: string; amount: number }): Promise<PayrollSavingsEntry | null> {
  const existing = await getEntryByPlanId(plan.id);
  if (existing) return existing;
  const created = await upsertEntry({
    employeeId: plan.employeeId,
    planId: plan.id,
    originalAmount: plan.amount,
    amountPaid: 0,
    status: "pending",
    paused: false,
  });
  return created;
}