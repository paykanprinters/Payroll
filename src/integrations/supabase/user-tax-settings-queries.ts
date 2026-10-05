import { supabase } from "@/integrations/supabase/client";
import { keysToSnakeCase, mapKeysToCamelCase } from "@/lib/case-converters";
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
export const convertUserTaxSettingsKeysToCamelCase = (obj: unknown): UserTaxSettings =>
  mapKeysToCamelCase<UserTaxSettings>(obj);

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertUserTaxSettingsKeysToSnakeCase = (
  obj: Partial<UserTaxSettings>
): Record<string, unknown> => keysToSnakeCase(obj);

const normalizeUserTaxSettings = (row: unknown): UserTaxSettings => {
  const camelCaseData = convertUserTaxSettingsKeysToCamelCase(row);
  if (camelCaseData.proRateUifCapByFrequency === undefined) {
    camelCaseData.proRateUifCapByFrequency = false;
  }
  if (camelCaseData.applyMedicalAidTaxCredit === undefined) {
    camelCaseData.applyMedicalAidTaxCredit = true;
  }
  return camelCaseData;
};

export const fetchUserTaxSettingsFromSupabase = async (userId: string): Promise<UserTaxSettings | null> => {
  logger.debug("user-tax-settings-queries: fetching live user tax settings");
  const { data, error } = await supabase
    .from('user_tax_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error("user-tax-settings-queries: error fetching live user tax settings:", toLogError(error));
    showError("Failed to load live user tax settings.");
    return null;
  }
  if (data) return normalizeUserTaxSettings(data);

  // Company payroll flags are stored once. A manager who has not saved their
  // own copy still has to calculate pay with those flags.
  const { data: companyRow, error: companyError } = await supabase
    .from('user_tax_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (companyError) {
    logger.error("user-tax-settings-queries: error fetching company tax settings:", toLogError(companyError));
    showError("Failed to load live user tax settings.");
    return null;
  }
  return companyRow ? normalizeUserTaxSettings(companyRow) : null;
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