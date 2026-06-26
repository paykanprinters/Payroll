import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

export interface UserTaxSettings {
  id?: string;
  userId: string;
  applyPaye: boolean;
  applySdl: boolean;
  enableIrp5Export: boolean;
  irp5ContentFontSize: number;
  proRateUifCapByFrequency?: boolean; // NEW: control pro-rated UIF cap
  applyMedicalAidTaxCredit?: boolean; // COMP-07: apply Section 6A medical scheme tax credit
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
  logger.debug("user-tax-settings-queries: fetching live user tax settings");
  const { data, error } = await supabase
    .from('user_tax_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
    logger.error("user-tax-settings-queries: error fetching live user tax settings:", toLogError(error));
    showError("Failed to load live user tax settings.");
    return null;
  } else if (data) {
    const camelCaseData = convertUserTaxSettingsKeysToCamelCase(data);
    // Ensure new field has a default when missing
    if (camelCaseData.proRateUifCapByFrequency === undefined) {
      camelCaseData.proRateUifCapByFrequency = false;
    }
    // Medical scheme tax credit defaults ON (statutory) when not yet configured.
    if (camelCaseData.applyMedicalAidTaxCredit === undefined) {
      camelCaseData.applyMedicalAidTaxCredit = true;
    }
    return camelCaseData;
  }
  return null;
};

export const upsertUserTaxSettingsToSupabase = async (settingsData: UserTaxSettings): Promise<UserTaxSettings | null> => {
  const snakeCasePayload = convertUserTaxSettingsKeysToSnakeCase(settingsData);
  logger.debug("user-tax-settings-queries: upserting live user tax settings");

  let { data, error } = await supabase
    .from('user_tax_settings')
    .upsert(snakeCasePayload, { onConflict: 'user_id' }) // Upsert based on user_id
    .select()
    .single();

  // Graceful fallback if the COMP-07 migration (20260626120000) hasn't been
  // applied yet: retry without the medical-credit column so settings still save.
  if (error && /apply_medical_aid_tax_credit/.test(error.message || "")) {
    logger.warn(
      "user-tax-settings-queries: apply_medical_aid_tax_credit column missing — apply migration 20260626120000_medical_aid_tax_credit.sql. Saving without it for now."
    );
    const fallbackPayload = { ...snakeCasePayload };
    delete fallbackPayload.apply_medical_aid_tax_credit;
    ({ data, error } = await supabase
      .from('user_tax_settings')
      .upsert(fallbackPayload, { onConflict: 'user_id' })
      .select()
      .single());
  }

  if (error) {
    logger.error("user-tax-settings-queries: error upserting live user tax settings:", toLogError(error));
    showError(`Failed to save user tax settings: ${toLogError(error)}`);
    return null;
  } else if (data) {
    const camelCaseData = convertUserTaxSettingsKeysToCamelCase(data);
    return camelCaseData;
  }
  logger.warn("user-tax-settings-queries: upsert succeeded but returned no data.");
  return null;
};