import { supabase } from "@/integrations/supabase/client";
import { SavingPlan } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";

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
  console.log("saving-queries: Fetching live saving plans from Supabase...");
  const { data, error } = await supabase
    .from('saving_plans')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error("saving-queries: Error fetching live saving plans:", error);
    showError("Failed to load live saving plan data.");
    return [];
  } else {
    const camelCaseData = data.map(convertSavingPlanKeysToCamelCase);
    console.log("saving-queries: Live saving plans fetched:", camelCaseData);
    return camelCaseData;
  }
};

export const upsertSavingPlanToSupabase = async (savingPlanData: SavingPlan): Promise<SavingPlan | null> => {
  const snakeCasePayload = convertSavingPlanKeysToSnakeCase(savingPlanData);
  console.log("saving-queries: Upserting live saving plan with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('saving_plans')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error("saving-queries: Error upserting live saving plan:", error);
    showError(`Failed to save saving plan: ${error.message}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertSavingPlanKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    console.warn("saving-queries: Upsert succeeded but returned no data.");
    return null;
  }
};

export const deleteSavingPlanFromSupabase = async (id: string): Promise<boolean> => {
  console.log("saving-queries: Deleting saving plan with id:", id);
  const { error } = await supabase
    .from('saving_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("saving-queries: Error deleting saving plan:", error);
    showError(`Failed to delete saving plan: ${error.message}`);
    return false;
  }
  return true;
};