import { supabase } from "@/integrations/supabase/client";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";
import { logger, toLogError } from "@/lib/logger";

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

// Fields that exist on MockPayslip in-memory but are not (yet) persisted columns.
// employerSdl is computed at payroll-run time for reporting; its dedicated column
// and persistence are introduced with the EMP201 work (COMP-10). Sending it now
// would fail the upsert with an unknown-column error.
const NON_PERSISTED_PAYSLIP_KEYS = new Set(["employerSdl"]);

// Helper to convert camelCase to snake_case for Supabase inserts/updates
export const convertPayslipKeysToSnakeCase = (obj: Partial<MockPayslip>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (NON_PERSISTED_PAYSLIP_KEYS.has(key)) continue;
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const fetchPayslipsFromSupabase = async (): Promise<MockPayslip[]> => {
  logger.debug("payslip-queries: fetching live payslips");
  const { data, error } = await supabase
    .from('payslips')
    .select('*')
    .order('pay_period', { ascending: false });

  if (error) {
    logger.error("payslip-queries: error fetching live payslips:", toLogError(error));
    showError("Failed to load live payslip data.");
    return [];
  } else {
    const camelCaseData = data.map(convertPayslipKeysToCamelCase);
    return camelCaseData;
  }
};

export const upsertPayslipToSupabase = async (payslipData: MockPayslip): Promise<MockPayslip | null> => {
  const snakeCasePayload = convertPayslipKeysToSnakeCase(payslipData);
  logger.debug("payslip-queries: upserting live payslip");

  const { data, error } = await supabase
    .from('payslips')
    .upsert(snakeCasePayload, { onConflict: 'id' })
    .select();

  if (error) {
    logger.error("payslip-queries: error upserting live payslip:", toLogError(error));
    showError(`Failed to save payslip: ${toLogError(error)}`);
    return null;
  } else if (data && data.length > 0) {
    const camelCaseData = convertPayslipKeysToCamelCase(data[0]);
    return camelCaseData;
  } else {
    logger.warn("payslip-queries: upsert succeeded but returned no data.");
    return null;
  }
};

// Deletes payslips by id. Used when voiding a payroll run to reverse the
// financial entries it generated. payroll_run_items.payslip_id is SET NULL on
// delete, so the run-item audit rows are retained while the payslips are removed.
export const deletePayslipsByIds = async (ids: string[]): Promise<boolean> => {
  const cleanIds = Array.from(new Set(ids.filter(Boolean)));
  if (cleanIds.length === 0) return true;

  logger.debug(`payslip-queries: deleting ${cleanIds.length} payslip(s) for run void.`);
  const { error } = await supabase.from("payslips").delete().in("id", cleanIds);

  if (error) {
    logger.error("payslip-queries: error deleting payslips by id:", toLogError(error));
    showError(`Failed to remove payslips: ${toLogError(error)}`);
    return false;
  }
  return true;
};

export const batchUpsertPayslipsToSupabase = async (payslipsToUpsert: MockPayslip[]): Promise<boolean> => {
  const snakeCasePayloads = payslipsToUpsert.map(convertPayslipKeysToSnakeCase);
  logger.debug(`payslip-queries: batch upserting ${payslipsToUpsert.length} live payslips.`);

  const { error } = await supabase
    .from('payslips')
    .upsert(snakeCasePayloads, { onConflict: 'employee_id, pay_period' }); // Conflict on employee_id and pay_period for payslips

  if (error) {
    logger.error("payslip-queries: error batch upserting live payslips:", toLogError(error));
    showError(`Failed to save payslips: ${toLogError(error)}`);
    return false;
  } else {
    return true;
  }
};