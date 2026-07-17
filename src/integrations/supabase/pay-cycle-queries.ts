import { supabase } from "@/integrations/supabase/client";
import { keysToSnakeCase, mapKeysToCamelCase } from "@/lib/case-converters";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

export interface PayCycleSettings {
  id?: string;
  userId: string;
  payCycleType: "Monthly" | "Weekly" | "Bi-Weekly";
  cutOffDay: number; // For weekly: 1=Monday, 7=Sunday. For monthly: day of month (1-31)
  payDayOffset: number; // Days after cut-off to make payment
}

// Helper to convert snake_case to camelCase for Supabase data
export const convertPayCycleSettingsKeysToCamelCase = (obj: unknown): PayCycleSettings =>
  mapKeysToCamelCase<PayCycleSettings>(obj);

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertPayCycleSettingsKeysToSnakeCase = (
  obj: Partial<PayCycleSettings>
): Record<string, unknown> => keysToSnakeCase(obj);

export const fetchPayCycleSettingsFromSupabase = async (userId: string): Promise<PayCycleSettings | null> => {
  logger.debug("pay-cycle-queries: fetching live pay cycle settings");
  const { data, error } = await supabase
    .from('pay_cycle_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
    logger.error("pay-cycle-queries: error fetching live pay cycle settings:", toLogError(error));
    showError("Failed to load live pay cycle settings.");
    return null;
  } else if (data) {
    const camelCaseData = convertPayCycleSettingsKeysToCamelCase(data);
    return camelCaseData;
  }
  return null;
};

export const upsertPayCycleSettingsToSupabase = async (settingsData: PayCycleSettings): Promise<PayCycleSettings | null> => {
  const snakeCasePayload = convertPayCycleSettingsKeysToSnakeCase(settingsData);
  logger.debug("pay-cycle-queries: upserting live pay cycle settings");

  const { data, error } = await supabase
    .from('pay_cycle_settings')
    .upsert(snakeCasePayload, { onConflict: 'user_id' }) // Upsert based on user_id
    .select()
    .single();

  if (error) {
    logger.error("pay-cycle-queries: error upserting live pay cycle settings:", toLogError(error));
    showError(`Failed to save pay cycle settings: ${toLogError(error)}`);
    return null;
  } else if (data) {
    const camelCaseData = convertPayCycleSettingsKeysToCamelCase(data);
    return camelCaseData;
  }
  logger.warn("pay-cycle-queries: upsert succeeded but returned no data.");
  return null;
};