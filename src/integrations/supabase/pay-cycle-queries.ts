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

export const fetchPayCycleSettingsFromSupabase = async (): Promise<PayCycleSettings | null> => {
  logger.debug("pay-cycle-queries: fetching company pay cycle settings");
  const { data, error } = await supabase
    .from("pay_cycle_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("pay-cycle-queries: error fetching live pay cycle settings:", toLogError(error));
    showError("Failed to load live pay cycle settings.");
    return null;
  }
  return data ? convertPayCycleSettingsKeysToCamelCase(data) : null;
};

export const upsertPayCycleSettingsToSupabase = async (settingsData: PayCycleSettings): Promise<PayCycleSettings | null> => {
  const existing = await fetchPayCycleSettingsFromSupabase();
  const companySettings: PayCycleSettings = existing
    ? { ...settingsData, id: existing.id, userId: existing.userId }
    : settingsData;
  const snakeCasePayload = convertPayCycleSettingsKeysToSnakeCase(companySettings);
  logger.debug("pay-cycle-queries: upserting live pay cycle settings");

  const { data, error } = await supabase
    .from("pay_cycle_settings")
    .upsert(snakeCasePayload, { onConflict: "id" })
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