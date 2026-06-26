"use client";

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

export type PaymentBatchStatus = "Pending" | "Exported" | "Reconciled" | "Failed";
export type PaymentItemStatus = "Pending" | "Paid" | "Failed" | "Returned";

export interface PaymentBatch {
  id: string;
  runId: string;
  userId: string | null;
  bankFormat: string;
  totalItems: number;
  totalAmount: number;
  status: PaymentBatchStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PaymentBatchItem {
  id: string;
  batchId: string;
  employeeId: string;
  netPay: number;
  accountHolder?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
  status: PaymentItemStatus;
  errorMessage?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

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

export const fetchPaymentBatches = async (): Promise<PaymentBatch[]> => {
  const { data, error } = await supabase
    .from("payment_batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("payment-batch-queries: fetchPaymentBatches error", toLogError(error));
    showError("Failed to load payment batches.");
    return [];
  }
  return (data || []).map(toCamel) as PaymentBatch[];
};

export const fetchPaymentBatchById = async (id: string): Promise<PaymentBatch | null> => {
  const { data, error } = await supabase.from("payment_batches").select("*").eq("id", id).single();

  if (error) {
    logger.error("payment-batch-queries: fetchPaymentBatchById error", toLogError(error));
    showError("Failed to load payment batch.");
    return null;
  }
  return toCamel(data) as PaymentBatch;
};

export const fetchPaymentBatchByRunId = async (runId: string): Promise<PaymentBatch | null> => {
  const { data, error } = await supabase
    .from("payment_batches")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    logger.error("payment-batch-queries: fetchPaymentBatchByRunId error", toLogError(error));
    showError("Failed to load payment batch for this run.");
    return null;
  }

  return data && data[0] ? (toCamel(data[0]) as PaymentBatch) : null;
};

export const createPaymentBatch = async (
  runId: string,
  bankFormat: string,
  totalItems: number,
  totalAmount: number
): Promise<PaymentBatch | null> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;

  const payload = toSnake({
    runId,
    userId,
    bankFormat,
    totalItems,
    totalAmount,
    status: "Pending",
  });

  const { data, error } = await supabase.from("payment_batches").insert(payload).select();

  if (error) {
    logger.error("payment-batch-queries: createPaymentBatch error", toLogError(error));
    showError(`Failed to create payment batch: ${toLogError(error)}`);
    return null;
  }
  return data && data[0] ? (toCamel(data[0]) as PaymentBatch) : null;
};

export const fetchBatchItems = async (batchId: string): Promise<PaymentBatchItem[]> => {
  const { data, error } = await supabase
    .from("payment_batch_items")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("payment-batch-queries: fetchBatchItems error", toLogError(error));
    showError("Failed to load payment batch items.");
    return [];
  }
  return (data || []).map(toCamel) as PaymentBatchItem[];
};

export const addBatchItems = async (
  batchId: string,
  items: Omit<PaymentBatchItem, "id" | "batchId" | "createdAt" | "updatedAt">[]
): Promise<boolean> => {
  const payloads = items.map((it) => toSnake({ ...it, batchId }));
  const { error } = await supabase.from("payment_batch_items").insert(payloads);

  if (error) {
    logger.error("payment-batch-queries: addBatchItems error", toLogError(error));
    showError(`Failed to add payment items: ${toLogError(error)}`);
    return false;
  }
  return true;
};

// Deletes a payment batch and its items. Used when voiding a payroll run so the
// pending batch is reversed alongside the run's payslips. Items are removed first
// in case the FK is not configured to cascade.
export const deletePaymentBatch = async (batchId: string): Promise<boolean> => {
  const { error: itemsError } = await supabase
    .from("payment_batch_items")
    .delete()
    .eq("batch_id", batchId);

  if (itemsError) {
    logger.error("payment-batch-queries: deletePaymentBatch items error", toLogError(itemsError));
    showError(`Failed to remove payment items: ${toLogError(itemsError)}`);
    return false;
  }

  const { error } = await supabase.from("payment_batches").delete().eq("id", batchId);

  if (error) {
    logger.error("payment-batch-queries: deletePaymentBatch error", toLogError(error));
    showError(`Failed to remove payment batch: ${toLogError(error)}`);
    return false;
  }
  return true;
};

export const updateBatchStatus = async (batchId: string, status: PaymentBatchStatus): Promise<boolean> => {
  const { error } = await supabase.from("payment_batches").update(toSnake({ status })).eq("id", batchId);

  if (error) {
    logger.error("payment-batch-queries: updateBatchStatus error", toLogError(error));
    showError(`Failed to update batch status: ${toLogError(error)}`);
    return false;
  }
  return true;
};

export const updateItemStatus = async (
  itemId: string,
  status: PaymentItemStatus,
  errorMessage?: string | null
): Promise<boolean> => {
  const { error } = await supabase
    .from("payment_batch_items")
    .update(toSnake({ status, errorMessage: errorMessage ?? null }))
    .eq("id", itemId);

  if (error) {
    logger.error("payment-batch-queries: updateItemStatus error", toLogError(error));
    showError(`Failed to update item: ${toLogError(error)}`);
    return false;
  }
  return true;
};