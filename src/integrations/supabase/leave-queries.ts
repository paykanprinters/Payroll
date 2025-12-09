import { supabase } from "@/integrations/supabase/client";
import { LeaveEntry } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";

// Helper to convert snake_case to camelCase for Supabase data
export const convertLeaveEntryKeysToCamelCase = (obj: any): LeaveEntry => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as LeaveEntry;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertLeaveEntryKeysToSnakeCase = (obj: Partial<LeaveEntry>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchLeaveRecordsFromSupabase = async (): Promise<LeaveEntry[]> => {
  console.log("leave-queries: Fetching live leave records from Supabase...");
  const { data, error } = await supabase
    .from('leave_records')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error("leave-queries: Error fetching live leave records:", error);
    showError("Failed to load live leave record data.");
    return [];
  } else {
    const camelCaseData = data.map(convertLeaveEntryKeysToCamelCase);
    console.log("leave-queries: Live leave records fetched:", camelCaseData);
    return camelCaseData;
  }
};

export const upsertLeaveRecordToSupabase = async (leaveRecordData: LeaveEntry): Promise<LeaveEntry | null> => {
  const snakeCasePayload = convertLeaveEntryKeysToSnakeCase(leaveRecordData);
  console.log("leave-queries: Upserting live leave record with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('leave_records')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error("leave-queries: Error upserting live leave record:", error);
    showError(`Failed to save leave record: ${error.message}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertLeaveEntryKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    console.warn("leave-queries: Upsert succeeded but returned no data.");
    return null;
  }
};