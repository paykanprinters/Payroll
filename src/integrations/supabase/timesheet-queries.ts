import { supabase } from "@/integrations/supabase/client";
import { TimesheetEntry } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";
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
  console.log("timesheet-queries: Fetching live timesheets from Supabase...");
  const { data, error } = await supabase
    .from('timesheets')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error("timesheet-queries: Error fetching live timesheets:", error);
    showError("Failed to load live timesheet data.");
    return [];
  } else {
    const camelCaseData = data.map(convertTimesheetKeysToCamelCase);
    console.log("timesheet-queries: Live timesheets fetched:", camelCaseData);
    return camelCaseData;
  }
};

export const upsertTimesheetToSupabase = async (timesheetData: TimesheetEntry): Promise<TimesheetEntry | null> => {
  const snakeCasePayload = convertTimesheetKeysToSnakeCase(timesheetData);
  console.log("timesheet-queries: Upserting live timesheet with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('timesheets')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error("timesheet-queries: Error upserting live timesheet:", error);
    showError(`Failed to save timesheet: ${error.message}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertTimesheetKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    console.warn("timesheet-queries: Upsert succeeded but returned no data.");
    return null;
  }
};

export const deleteTimesheetFromSupabase = async (timesheetId: string): Promise<boolean> => {
  console.log("timesheet-queries: Deleting live timesheet with ID:", timesheetId);
  const { error } = await supabase
    .from('timesheets')
    .delete()
    .eq('id', timesheetId);

  if (error) {
    console.error("timesheet-queries: Error deleting live timesheet:", error);
    showError(`Failed to delete timesheet: ${error.message}`);
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
    console.error("timesheet-queries: Error fetching existing timesheet for status update:", fetchError);
    showError(`Failed to update timesheet status: ${fetchError.message}`);
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
    console.error("timesheet-queries: Error updating live timesheet status:", error);
    showError(`Failed to update timesheet status: ${error.message}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertTimesheetKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    console.warn("timesheet-queries: Status update succeeded but returned no data.");
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
    console.error("timesheet-queries: Error batch upserting live timesheets:", error);
    showError(`Failed to import timesheets: ${error.message}`);
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
    console.error("timesheet-queries: Error fetching existing timesheets for batch:", fetchError);
    showError("Failed to check for existing timesheets during import.");
    return [];
  }
  return existingLiveTimesheets?.map(convertTimesheetKeysToCamelCase) || [];
};