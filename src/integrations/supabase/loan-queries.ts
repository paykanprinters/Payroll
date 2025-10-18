import { supabase } from "@/integrations/supabase/client";
import { Loan } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";

// Helper to convert snake_case to camelCase for Supabase data
export const convertLoanKeysToCamelCase = (obj: any): Loan => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as Loan;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertLoanKeysToSnakeCase = (obj: Partial<Loan>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchLoansFromSupabase = async (): Promise<Loan[]> => {
  console.log("loan-queries: Fetching live loans from Supabase...");
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error("loan-queries: Error fetching live loans:", error);
    showError("Failed to load live loan data.");
    return [];
  } else {
    const camelCaseData = data.map(convertLoanKeysToCamelCase);
    console.log("loan-queries: Live loans fetched:", camelCaseData);
    return camelCaseData;
  }
};

export const upsertLoanToSupabase = async (loanData: Loan): Promise<Loan | null> => {
  const snakeCasePayload = convertLoanKeysToSnakeCase(loanData);
  console.log("loan-queries: Upserting live loan with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('loans')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error("loan-queries: Error upserting live loan:", error);
    showError(`Failed to save loan: ${error.message}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertLoanKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    console.warn("loan-queries: Upsert succeeded but returned no data.");
    return null;
  }
};

export const deleteLoanFromSupabase = async (loanId: string): Promise<boolean> => {
  console.log("loan-queries: Deleting live loan with ID:", loanId);
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', loanId);

  if (error) {
    console.error("loan-queries: Error deleting live loan:", error);
    showError(`Failed to delete loan: ${error.message}`);
    return false;
  } else {
    return true;
  }
};