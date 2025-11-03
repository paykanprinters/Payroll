import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

export interface UserTaxSettings {
  id?: string;
  userId: string;
  applyPaye: boolean;
  applySdl: boolean;
  enableIrp5Export: boolean;
  irp5ContentFontSize: number;
  proRateUifCapByFrequency?: boolean; // NEW: control pro-rated UIF cap
}

// Helper to convert snake_case to camelCase for Supabase data
export const convertUserTaxSettingsKeysToCamelCase = (obj: any): UserTaxSettings => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as UserTaxSettings;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertUserTaxSettingsKeysToSnakeCase = (obj: Partial<UserTaxSettings>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchUserTaxSettingsFromSupabase = async (userId: string): Promise<UserTaxSettings | null> => {
  console.log("user-tax-settings-queries: Fetching live user tax settings from Supabase for user:", userId);
  const { data, error } = await supabase
    .from('user_tax_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("user-tax-settings-queries: Error fetching live user tax settings:", error);
    showError("Failed to load live user tax settings.");
    return null;
  } else if (data) {
    const camelCaseData = convertUserTaxSettingsKeysToCamelCase(data);
    // Ensure new field has a default when missing
    if (camelCaseData.proRateUifCapByFrequency === undefined) {
      camelCaseData.proRateUifCapByFrequency = false;
    }
    console.log("user-tax-settings-queries: Live user tax settings fetched:", camelCaseData);
    return camelCaseData;
  }
  console.log("user-tax-settings-queries: No user tax settings found for user:", userId);
  return null;
};

export const upsertUserTaxSettingsToSupabase = async (settingsData: UserTaxSettings): Promise<UserTaxSettings | null> => {
  const snakeCasePayload = convertUserTaxSettingsKeysToSnakeCase(settingsData);
  console.log("user-tax-settings-queries: Upserting live user tax settings with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('user_tax_settings')
    .upsert(snakeCasePayload, { onConflict: 'user_id' }) // Upsert based on user_id
    .select()
    .single();

  if (error) {
    console.error("user-tax-settings-queries: Error upserting live user tax settings:", error);
    showError(`Failed to save user tax settings: ${error.message}`);
    return null;
  } else if (data) {
    const camelCaseData = convertUserTaxSettingsKeysToCamelCase(data);
    return camelCaseData;
  }
  console.warn("user-tax-settings-queries: Upsert succeeded but returned no data.");
  return null;
};