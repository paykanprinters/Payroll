import { supabase } from "@/integrations/supabase/client";
import { LeaveEntry } from "@/lib/mock-data-interfaces";
import { normalizeLeaveStatus } from "@/lib/leave-status";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

const SNAKE_TO_CAMEL: Record<string, keyof LeaveEntry | string> = {
  employee_id: "employeeId",
  leave_type: "leaveType",
  start_date: "startDate",
  end_date: "endDate",
  total_days: "totalDays",
  working_days: "workingDays",
  document_url: "documentUrl",
  submitted_at: "submittedAt",
  submitted_by: "submittedByUserId",
  reviewed_at: "reviewedAt",
  reviewed_by: "reviewedByUserId",
  rejection_reason: "rejectionReason",
};

const CAMEL_TO_SNAKE: Partial<Record<keyof LeaveEntry, string>> = {
  employeeId: "employee_id",
  leaveType: "leave_type",
  startDate: "start_date",
  endDate: "end_date",
  totalDays: "total_days",
  workingDays: "working_days",
  documentUrl: "document_url",
  submittedAt: "submitted_at",
  submittedByUserId: "submitted_by",
  reviewedAt: "reviewed_at",
  reviewedByUserId: "reviewed_by",
  rejectionReason: "rejection_reason",
};

export const convertLeaveEntryKeysToCamelCase = (obj: Record<string, unknown>): LeaveEntry => {
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const camelKey = SNAKE_TO_CAMEL[key] || key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    newObj[camelKey] = obj[key];
  }
  const entry = newObj as LeaveEntry;
  entry.status = normalizeLeaveStatus(entry.status);
  return entry;
};

export const convertLeaveEntryKeysToSnakeCase = (obj: Partial<LeaveEntry>): Record<string, unknown> => {
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const camelKey = key as keyof LeaveEntry;
    const snakeKey =
      CAMEL_TO_SNAKE[camelKey] ||
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = (obj as Record<string, unknown>)[key];
  }
  return newObj;
};

export const fetchLeaveRecordsFromSupabase = async (): Promise<LeaveEntry[]> => {
  const { data, error } = await supabase
    .from("leave_records")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    logger.error("leave-queries: error fetching live leave records:", toLogError(error));
    showError("Failed to load live leave record data.");
    return [];
  }

  return (data || []).map((row) => convertLeaveEntryKeysToCamelCase(row as Record<string, unknown>));
};

export const upsertLeaveRecordToSupabase = async (leaveRecordData: LeaveEntry): Promise<LeaveEntry | null> => {
  const snakeCasePayload = {
    ...convertLeaveEntryKeysToSnakeCase(leaveRecordData),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("leave_records")
    .upsert(snakeCasePayload, { onConflict: "id" })
    .select();

  if (error) {
    logger.error("leave-queries: error upserting live leave record:", toLogError(error));
    showError(`Failed to save leave record: ${toLogError(error)}`);
    return null;
  }

  if (data && data.length > 0) {
    return convertLeaveEntryKeysToCamelCase(data[0] as Record<string, unknown>);
  }

  return null;
};

export const deleteLeaveRecordFromSupabase = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("leave_records").delete().eq("id", id);

  if (error) {
    logger.error("leave-queries: error deleting leave record:", toLogError(error));
    showError(`Failed to delete leave record: ${toLogError(error)}`);
    return false;
  }

  return true;
};
