import { supabase } from "@/integrations/supabase/client";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";

// Helper to convert snake_case to camelCase for Supabase data
export const convertPayslipKeysToCamelCase = (obj: any): MockPayslip => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as MockPayslip;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertPayslipKeysToSnakeCase = (obj: Partial<MockPayslip>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchPayslipsFromSupabase = async (): Promise<MockPayslip[]> => {
  console.log("payslip-queries: Fetching live payslips from Supabase...");
  const { data, error } = await supabase
    .from('payslips')
    .select('*')
    .order('pay_period', { ascending: false });

  if (error) {
    console.error("payslip-queries: Error fetching live payslips:", error);
    showError("Failed to load live payslip data.");
    return [];
  } else {
    const camelCaseData = data.map(convertPayslipKeysToCamelCase);
    console.log("payslip-queries: Live payslips fetched:", camelCaseData);
    return camelCaseData;
  }
};

export const upsertPayslipToSupabase = async (payslipData: MockPayslip): Promise<MockPayslip | null> => {
  const snakeCasePayload = convertPayslipKeysToSnakeCase(payslipData);
  console.log("payslip-queries: Upserting live payslip with payload:", snakeCasePayload);

  const { data, error } = await supabase
    .from('payslips')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error("payslip-queries: Error upserting live payslip:", error);
    showError(`Failed to save payslip: ${error.message}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertPayslipKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    console.warn("payslip-queries: Upsert succeeded but returned no data.");
    return null;
  }
};

export const batchUpsertPayslipsToSupabase = async (payslipsToUpsert: MockPayslip[]): Promise<boolean> => {
  const snakeCasePayloads = payslipsToUpsert.map(convertPayslipKeysToSnakeCase);
  console.log(`payslip-queries: Batch upserting ${payslipsToUpsert.length} live payslips.`);

  const { error } = await supabase
    .from('payslips')
    .upsert(snakeCasePayloads, { onConflict: 'employee_id, pay_period' }); // Conflict on employee_id and pay_period for payslips

  if (error) {
    console.error("payslip-queries: Error batch upserting live payslips:", error);
    showError(`Failed to save payslips: ${error.message}`);
    return false;
  } else {
    return true;
  }
};