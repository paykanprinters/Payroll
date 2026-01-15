"use client";

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export type PayrollRunStatus = 'Draft' | 'Reviewed' | 'Approved' | 'Locked' | 'Paid';

export interface PayrollRun {
  id: string;
  userId: string | null;
  periodStart: string; // yyyy-mm-dd
  periodEnd: string;   // yyyy-mm-dd
  payCycleType: string;
  status: PayrollRunStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  paidAt?: string | null;
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
const toCamel = (obj: any) => {
  const out: any = {};
  for (const k in obj) {
    const camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = obj[k];
  }
  return out;
};
const toSnake = (obj: any) => {
  const out: any = {};
  for (const k in obj) {
    const snakeKey = k.replace(/[A-Z]/g, (L) => `_${L.toLowerCase()}`);
    out[snakeKey] = obj[k];
  }
  return out;
};

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
    console.error("payroll-run-queries: createPayrollRun error", error);
    showError(`Failed to create run: ${error.message}`);
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
    console.error("payroll-run-queries: fetchPayrollRuns error", error);
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
    console.error("payroll-run-queries: fetchPayrollRunById error", error);
    showError("Failed to load run.");
    return null;
  }
  return toCamel(data) as PayrollRun;
};

export const updatePayrollRunStatus = async (id: string, status: PayrollRunStatus, approverId?: string | null): Promise<boolean> => {
  const patch: any = { status };
  const now = new Date().toISOString();

  if (status === "Approved") {
    patch.approvedBy = approverId ?? null;
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
    console.error("payroll-run-queries: updatePayrollRunStatus error", error);
    showError(`Failed to update status: ${error.message}`);
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
    console.error("payroll-run-queries: fetchRunItems error", error);
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
    console.error("payroll-run-queries: addRunItems error", error);
    showError(`Failed to add items: ${error.message}`);
    return false;
  }
  return true;
};