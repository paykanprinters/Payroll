import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export interface PayCycleSettings {
  id?: string;
  userId: string;
  payCycleType: "Monthly" | "Weekly" | "Bi-Weekly";
  cutOffDay: number; // For weekly: 1=Monday, 7=Sunday. For monthly: day of month (1-31)
  payDayOffset: number; // Days after cut-off to make payment
}

// Helper to convert snake_case to camelCase for Supabase data
export const convertPayCycleSettingsKeysToCamelCase = (obj: any): PayCycleSettings => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as PayCycleSettings;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertPayCycleSettingsKeysToSnakeCase = (obj: Partial<PayCycleSettings>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchPayCycleSettingsFromSupabase = async (userId: string): Promise<PayCycleSettings | null> => {
  console.log("pay-cycle-queries: Fetching live pay cycle settings from Supabase for user:", userId);
  const { data, error } = await supabase
    .from('pay_cycle_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("pay-cycle-queries: Error fetching live pay cycle settings:", error);
    showError("Failed to load live pay cycle settings.");
    return null;
  } else if (data) {
    const camelCaseData = convertPayCycleSettingsKeysToCamelCase(data);
    console.log("pay-cycle-queries: Live pay cycle settings fetched:", camelCaseData);
    return camelCaseData;
  }
  console.log("pay-cycle-queries: No pay cycle settings found for user:", userId);
  return null;
};

export const upsertPayCycleSettingsToSupabase = async (settingsData: PayCycleSettings): Promise<PayCycleSettings | null> => {
  const snakeCasePayload = convertPayCycleSettingsKeysToSnakeCase(settingsData);
  console.log("pay-cycle-queries: Upserting live pay cycle settings with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('pay_cycle_settings')
    .upsert(snakeCasePayload, { onConflict: 'user_id' }) // Upsert based on user_id
    .select()
    .single();

  if (error) {
    console.error("pay-cycle-queries: Error upserting live pay cycle settings:", error);
    showError(`Failed to save pay cycle settings: ${error.message}`);
    return null;
  } else if (data) {
    const camelCaseData = convertPayCycleSettingsKeysToCamelCase(data);
    return camelCaseData;
  }
  console.warn("pay-cycle-queries: Upsert succeeded but returned no data.");
  return null;
};