"use client";

import { supabase } from "@/integrations/supabase/client";
import { keysToCamelCase, keysToSnakeCase, type UnknownRecord } from "@/lib/case-converters";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

// 'Cancelled' is the voided terminal state. A run is voided (rather than deleted)
// once it has progressed beyond an empty Draft, so the record is preserved for
// SARS auditability while its financial artefacts (payslips/batch) are reversed.
export type PayrollRunStatus = 'Draft' | 'Reviewed' | 'Approved' | 'Locked' | 'Paid' | 'Cancelled';

export interface PayrollRun {
  id: string;
  userId: string | null;
  periodStart: string; // yyyy-mm-dd
  periodEnd: string;   // yyyy-mm-dd
  payCycleType: string;
  status: PayrollRunStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  paidAt?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PayrollRunItem {
  id: string;
  runId: string;
  employeeId: string;
  payslipId?: string | null;
  payPeriod: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// snake/camel helpers
const toCamel = (value: unknown): unknown => keysToCamelCase(value);
const toSnake = keysToSnakeCase;

// Runs
export const createPayrollRun = async (payload: Omit<PayrollRun, "id"|"status"|"userId"|"createdAt"|"updatedAt"> & { notes?: string | null }): Promise<PayrollRun | null> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;

  const insertPayload = {
    userId,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    payCycleType: payload.payCycleType,
    status: "Draft",
    notes: payload.notes ?? null,
  };
  const snake = toSnake(insertPayload);

  const { data, error } = await supabase
    .from("payroll_runs")
    .insert(snake)
    .select();

  if (error) {
    logger.error("payroll-run-queries: createPayrollRun error", toLogError(error));
    showError(`Failed to create run: ${toLogError(error)}`);
    return null;
  }
  return data && data[0] ? toCamel(data[0]) as PayrollRun : null;
};

export const fetchPayrollRuns = async (): Promise<PayrollRun[]> => {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("payroll-run-queries: fetchPayrollRuns error", toLogError(error));
    showError("Failed to load payroll runs.");
    return [];
  }
  return (data || []).map(toCamel) as PayrollRun[];
};

export const fetchPayrollRunById = async (id: string): Promise<PayrollRun | null> => {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("payroll-run-queries: fetchPayrollRunById error", toLogError(error));
    showError("Failed to load run.");
    return null;
  }
  return toCamel(data) as PayrollRun;
};

export const updatePayrollRunStatus = async (id: string, status: PayrollRunStatus, actorId?: string | null): Promise<boolean> => {
  const patch: UnknownRecord = { status };
  const now = new Date().toISOString();

  if (status === "Reviewed") {
    patch.reviewedBy = actorId ?? null;
    patch.reviewedAt = now;
  } else if (status === "Approved") {
    patch.approvedBy = actorId ?? null;
    patch.approvedAt = now;
  } else if (status === "Locked") {
    patch.lockedAt = now;
  } else if (status === "Paid") {
    patch.paidAt = now;
  }

  const snake = toSnake(patch);

  const { error } = await supabase
    .from("payroll_runs")
    .update(snake)
    .eq("id", id);

  if (error) {
    logger.error("payroll-run-queries: updatePayrollRunStatus error", toLogError(error));
    showError(`Failed to update status: ${toLogError(error)}`);
    return false;
  }
  return true;
};

// Void (cancel) a run. The run record is retained as a Cancelled audit entry
// with the actor and reason; financial artefacts are reversed by the caller.
export const voidPayrollRun = async (
  id: string,
  reason: string,
  actorId?: string | null
): Promise<boolean> => {
  const snake = toSnake({
    status: "Cancelled" as PayrollRunStatus,
    cancelledBy: actorId ?? null,
    cancelledAt: new Date().toISOString(),
    cancellationReason: reason,
  });

  const { error } = await supabase.from("payroll_runs").update(snake).eq("id", id);

  if (error) {
    logger.error("payroll-run-queries: voidPayrollRun error", toLogError(error));
    showError(`Failed to void run: ${toLogError(error)}`);
    return false;
  }
  return true;
};

// Items
export const fetchRunItems = async (runId: string): Promise<PayrollRunItem[]> => {
  const { data, error } = await supabase
    .from("payroll_run_items")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("payroll-run-queries: fetchRunItems error", toLogError(error));
    showError("Failed to load run items.");
    return [];
  }
  return (data || []).map(toCamel) as PayrollRunItem[];
};

export const addRunItems = async (runId: string, items: Omit<PayrollRunItem, "id"|"createdAt"|"updatedAt"|"runId">[]): Promise<boolean> => {
  const payloads = items.map((it) => toSnake({ ...it, runId }));
  const { error } = await supabase
    .from("payroll_run_items")
    .insert(payloads);

  if (error) {
    logger.error("payroll-run-queries: addRunItems error", toLogError(error));
    showError(`Failed to add items: ${toLogError(error)}`);
    return false;
  }
  return true;
};