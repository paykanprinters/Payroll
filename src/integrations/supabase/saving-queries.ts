import { supabase } from "@/integrations/supabase/client";
import { SavingPlan } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

// Helper to convert snake_case to camelCase for Supabase data
export const convertSavingPlanKeysToCamelCase = (obj: any): SavingPlan => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as SavingPlan;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertSavingPlanKeysToSnakeCase = (obj: Partial<SavingPlan>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchSavingPlansFromSupabase = async (): Promise<SavingPlan[]> => {
  logger.debug("saving-queries: fetching live saving plans");
  const { data, error } = await supabase
    .from('saving_plans')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    logger.error("saving-queries: error fetching live saving plans:", toLogError(error));
    showError("Failed to load live saving plan data.");
    return [];
  } else {
    const camelCaseData = data.map(convertSavingPlanKeysToCamelCase);
    return camelCaseData;
  }
};

export const upsertSavingPlanToSupabase = async (savingPlanData: SavingPlan): Promise<SavingPlan | null> => {
  const snakeCasePayload = convertSavingPlanKeysToSnakeCase(savingPlanData);
  logger.debug("saving-queries: upserting live saving plan");

  const { data, error } = await supabase
    .from('saving_plans')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    logger.error("saving-queries: error upserting live saving plan:", toLogError(error));
    showError(`Failed to save saving plan: ${toLogError(error)}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertSavingPlanKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    logger.warn("saving-queries: upsert succeeded but returned no data.");
    return null;
  }
};

export const deleteSavingPlanFromSupabase = async (id: string): Promise<boolean> => {
  logger.debug("saving-queries: deleting saving plan");
  const { error } = await supabase
    .from('saving_plans')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error("saving-queries: error deleting saving plan:", toLogError(error));
    showError(`Failed to delete saving plan: ${toLogError(error)}`);
    return false;
  }
  return true;
};