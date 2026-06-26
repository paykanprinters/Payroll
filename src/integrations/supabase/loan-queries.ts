import { supabase } from "@/integrations/supabase/client";
import { Loan } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

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
  logger.debug("loan-queries: fetching live loans");
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    logger.error("loan-queries: error fetching live loans:", toLogError(error));
    showError("Failed to load live loan data.");
    return [];
  } else {
    const camelCaseData = data.map(convertLoanKeysToCamelCase);
    return camelCaseData;
  }
};

export const upsertLoanToSupabase = async (loanData: Loan): Promise<Loan | null> => {
  const snakeCasePayload = convertLoanKeysToSnakeCase(loanData);
  logger.debug("loan-queries: upserting live loan");

  const { data, error } = await supabase
    .from('loans')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    logger.error("loan-queries: error upserting live loan:", toLogError(error));
    showError(`Failed to save loan: ${toLogError(error)}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertLoanKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    logger.warn("loan-queries: upsert succeeded but returned no data.");
    return null;
  }
};

export const deleteLoanFromSupabase = async (loanId: string): Promise<boolean> => {
  logger.debug("loan-queries: deleting live loan");
  const { error } = await supabase
    .from('loans')
    .delete()
    .eq('id', loanId);

  if (error) {
    logger.error("loan-queries: error deleting live loan:", toLogError(error));
    showError(`Failed to delete loan: ${toLogError(error)}`);
    return false;
  } else {
    return true;
  }
};