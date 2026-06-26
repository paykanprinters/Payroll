import { supabase } from "@/integrations/supabase/client";
import { TimesheetEntry } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";
// Removed: import { sql } from '@supabase/supabase-js'; // Import sql for raw SQL expressions

// Helper to convert snake_case to camelCase for Supabase data
export const convertTimesheetKeysToCamelCase = (obj: any): TimesheetEntry => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as TimesheetEntry;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertTimesheetKeysToSnakeCase = (obj: Partial<TimesheetEntry>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchTimesheetsFromSupabase = async (): Promise<TimesheetEntry[]> => {
  logger.debug("timesheet-queries: fetching live timesheets");
  const { data, error } = await supabase
    .from('timesheets')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    logger.error("timesheet-queries: error fetching live timesheets:", toLogError(error));
    showError("Failed to load live timesheet data.");
    return [];
  } else {
    const camelCaseData = data.map(convertTimesheetKeysToCamelCase);
    return camelCaseData;
  }
};

export const upsertTimesheetToSupabase = async (timesheetData: TimesheetEntry): Promise<TimesheetEntry | null> => {
  const snakeCasePayload = convertTimesheetKeysToSnakeCase(timesheetData);
  logger.debug("timesheet-queries: upserting live timesheet");

  const { data, error } = await supabase
    .from('timesheets')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    logger.error("timesheet-queries: error upserting live timesheet:", toLogError(error));
    showError(`Failed to save timesheet: ${toLogError(error)}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertTimesheetKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    logger.warn("timesheet-queries: upsert succeeded but returned no data.");
    return null;
  }
};

export const deleteTimesheetFromSupabase = async (timesheetId: string): Promise<boolean> => {
  logger.debug("timesheet-queries: deleting live timesheet");
  const { error } = await supabase
    .from('timesheets')
    .delete()
    .eq('id', timesheetId);

  if (error) {
    logger.error("timesheet-queries: error deleting live timesheet:", toLogError(error));
    showError(`Failed to delete timesheet: ${toLogError(error)}`);
    return false;
  } else {
    return true;
  }
};

export const updateTimesheetStatusInSupabase = async (timesheetId: string, newStatus: TimesheetEntry["status"]): Promise<TimesheetEntry | null> => {
  // 1. Fetch the existing timesheet to get the current audit_log
  const { data: existingTimesheetData, error: fetchError } = await supabase
    .from('timesheets')
    .select('audit_log')
    .eq('id', timesheetId)
    .single();

  if (fetchError) {
    logger.error("timesheet-queries: error fetching existing timesheet for status update:", toLogError(fetchError));
    showError(`Failed to update timesheet status: ${toLogError(fetchError)}`);
    return null;
  }

  const currentAuditLog = existingTimesheetData?.audit_log || [];
  const auditEntry = { action: `Status changed to ${newStatus}`, timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const };
  const updatedAuditLog = [...currentAuditLog, auditEntry];

  // 2. Update the timesheet with the new status and the full updated audit_log
  const { data, error } = await supabase
    .from('timesheets')
    .update({ status: newStatus, audit_log: updatedAuditLog }) // Pass the entire updated array
    .eq('id', timesheetId)
    .select();

  if (error) {
    logger.error("timesheet-queries: error updating live timesheet status:", toLogError(error));
    showError(`Failed to update timesheet status: ${toLogError(error)}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertTimesheetKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    logger.warn("timesheet-queries: status update succeeded but returned no data.");
    return null;
  }
};

export const batchUpsertTimesheetsToSupabase = async (timesheetsToUpsert: TimesheetEntry[]): Promise<boolean> => {
  // Convert to snake_case and upsert directly to respect existing RLS policies
  const snakeCasePayloads = timesheetsToUpsert.map(convertTimesheetKeysToSnakeCase);

  const { error } = await supabase
    .from('timesheets')
    .upsert(snakeCasePayloads, { onConflict: 'id' });

  if (error) {
    logger.error("timesheet-queries: error batch upserting live timesheets:", toLogError(error));
    showError(`Failed to import timesheets: ${toLogError(error)}`);
    return false;
  }

  return true;
};

export const fetchExistingTimesheetsForBatch = async (employeeIds: string[], dates: string[]): Promise<TimesheetEntry[]> => {
  const { data: existingLiveTimesheets, error: fetchError } = await supabase
    .from('timesheets')
    .select('*')
    .in('employee_id', employeeIds)
    .in('date', dates);

  if (fetchError) {
    logger.error("timesheet-queries: error fetching existing timesheets for batch:", toLogError(fetchError));
    showError("Failed to check for existing timesheets during import.");
    return [];
  }
  return existingLiveTimesheets?.map(convertTimesheetKeysToCamelCase) || [];
};