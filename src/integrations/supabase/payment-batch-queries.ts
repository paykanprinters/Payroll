"use client";

import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export type PaymentBatchStatus = 'Pending' | 'Exported' | 'Reconciled' | 'Failed';
export type PaymentItemStatus = 'Pending' | 'Paid' | 'Failed' | 'Returned';

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
    console.error("payment-batch-queries: fetchPaymentBatches error", error);
    showError("Failed to load payment batches.");
    return [];
  }
  return (data || []).map(toCamel) as PaymentBatch[];
};

export const fetchPaymentBatchById = async (id: string): Promise<PaymentBatch | null> => {
  const { data, error } = await supabase
    .from("payment_batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("payment-batch-queries: fetchPaymentBatchById error", error);
    showError("Failed to load payment batch.");
    return null;
  }
  return toCamel(data) as PaymentBatch;
};

export const createPaymentBatch = async (runId: string, bankFormat: string, totalItems: number, totalAmount: number): Promise<PaymentBatch | null> => {
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

  const { data, error } = await supabase
    .from("payment_batches")
    .insert(payload)
    .select();

  if (error) {
    console.error("payment-batch-queries: createPaymentBatch error", error);
    showError(`Failed to create payment batch: ${error.message}`);
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
    console.error("payment-batch-queries: fetchBatchItems error", error);
    showError("Failed to load payment batch items.");
    return [];
  }
  return (data || []).map(toCamel) as PaymentBatchItem[];
};

export const addBatchItems = async (batchId: string, items: Omit<PaymentBatchItem, "id"|"batchId"|"createdAt"|"updatedAt">[]): Promise<boolean> => {
  const payloads = items.map((it) => toSnake({ ...it, batchId }));
  const { error } = await supabase
    .from("payment_batch_items")
    .insert(payloads);

  if (error) {
    console.error("payment-batch-queries: addBatchItems error", error);
    showError(`Failed to add payment items: ${error.message}`);
    return false;
  }
  return true;
};

export const updateBatchStatus = async (batchId: string, status: PaymentBatchStatus): Promise<boolean> => {
  const { error } = await supabase
    .from("payment_batches")
    .update(toSnake({ status }))
    .eq("id", batchId);

  if (error) {
    console.error("payment-batch-queries: updateBatchStatus error", error);
    showError(`Failed to update batch status: ${error.message}`);
    return false;
  }
  return true;
};


export const updateItemStatus = async (itemId: string, status: PaymentItemStatus, errorMessage?: string | null): Promise<boolean> => {
  const { error } = await supabase
    .from("payment_batch_items")
    .update(toSnake({ status, errorMessage: errorMessage ?? null }))
    .eq("id", itemId);

  if (error) {
    console.error("payment-batch-queries: updateItemStatus error", error);
    showError(`Failed to update item: ${error.message}`);
    return false;
  }
  return true;
};