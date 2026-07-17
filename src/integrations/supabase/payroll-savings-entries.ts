"use client";

import { supabase } from "@/integrations/supabase/client";
import { isRecord, type UnknownRecord } from "@/lib/case-converters";
import { PayrollSavingsEntry, SavingsStatus, updateStatusClient } from "@/lib/savings-types";
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
    amountPaid: Number(row.amount_paid),
    remainingBalance: Number(row.remaining_balance),
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
  updateStatusClient(next);
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

export async function recordPayment(planId: string, amount: number): Promise<PayrollSavingsEntry | null> {
  const current = await getEntryByPlanId(planId);
  if (!current) return null;
  const next = { ...current, amountPaid: Math.max(0, current.amountPaid + amount) };
  updateStatusClient(next);
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
  updateStatusClient(next);
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
  updateStatusClient(next);
  const updated = await upsertEntry({
    id: current.id,
    planId,
    employeeId: current.employeeId,
    paused: false,
    status: next.status,
  });
  return updated;
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