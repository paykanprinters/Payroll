import { format, parseISO, subMonths } from "date-fns";
import type { MockCompanyDetails, MockPayslip, TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { PayCycleSettings } from "@/integrations/supabase/pay-cycle-queries";
import type { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import type { TaxTables } from "@/hooks/use-tax-tables";
import {
  validateLoadedTaxTables,
  type TaxTableValidationResult,
} from "@/lib/tax-tables-validation";

export type DashboardChartPeriod = "3m" | "6m" | "12m" | "all";

export interface DashboardAdminSummary {
  employeeCount: number;
  payslipCount: number;
  pendingTodoCount: number;
  timesheetsAwaitingAction: number;
  currentMonthGrossPayroll: number;
  setupReadyCount: number;
  setupTotal: number;
}

function monthKeyFromDateString(value: string | undefined | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
  try {
    const d = parseISO(value);
    if (!Number.isNaN(d.getTime())) return format(d, "yyyy-MM");
  } catch {
    // ignore
  }
  return null;
}

export function getChartPeriodCutoffKey(period: DashboardChartPeriod): string | null {
  if (period === "all") return null;
  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  return format(subMonths(new Date(), months), "yyyy-MM");
}

export function filterPayslipsByChartPeriod(
  payslips: MockPayslip[],
  period: DashboardChartPeriod
): MockPayslip[] {
  const cutoff = getChartPeriodCutoffKey(period);
  if (!cutoff) return payslips;

  return payslips.filter((p) => {
    const key =
      monthKeyFromDateString(p.payPeriod?.split(" - ")[0]) ?? monthKeyFromDateString(p.payDate);
    return key ? key >= cutoff : false;
  });
}

export function computeSetupReadyCount(input: {
  companyDetails: MockCompanyDetails | null;
  payCycleSettings: PayCycleSettings | null;
  userTaxSettings: UserTaxSettings | null;
  taxTables: TaxTables | { payeBrackets?: unknown[] } | null;
  activeTaxYearForCalculations?: string | number;
  taxTableValidation?: TaxTableValidationResult | null;
}): number {
  const payeApplies = input.userTaxSettings?.applyPaye ?? false;

  const companyNameOk = !!(
    input.companyDetails?.companyTradingName || input.companyDetails?.companyLegalName
  );
  const companyTaxOk = !payeApplies ? true : !!input.companyDetails?.companyTaxNumber;
  const companyOk = companyNameOk && companyTaxOk;

  const payCycleOk = !!input.payCycleSettings?.payCycleType;

  const taxSettingsOk = !!input.userTaxSettings;
  const taxYear =
    typeof input.activeTaxYearForCalculations === "number"
      ? input.activeTaxYearForCalculations
      : parseInt(String(input.activeTaxYearForCalculations ?? new Date().getFullYear()), 10);
  const taxTablesOk = !payeApplies
    ? true
    : (
        input.taxTableValidation ??
        validateLoadedTaxTables(input.taxTables as TaxTables | null, taxYear)
      ).isReady;
  const taxOk = taxSettingsOk && taxTablesOk;

  return [companyOk, payCycleOk, taxOk].filter(Boolean).length;
}

export function buildDashboardAdminSummary(input: {
  employeeCount: number;
  payslips: MockPayslip[];
  pendingTodoCount: number;
  timesheets: TimesheetEntry[];
  companyDetails: MockCompanyDetails | null;
  payCycleSettings: PayCycleSettings | null;
  userTaxSettings: UserTaxSettings | null;
  taxTables: TaxTables | { payeBrackets?: unknown[] } | null;
  activeTaxYearForCalculations?: string | number;
  taxTableValidation?: TaxTableValidationResult | null;
}): DashboardAdminSummary {
  const currentMonthKey = format(new Date(), "yyyy-MM");
  const currentMonthGrossPayroll = input.payslips
    .filter((p) => {
      const key =
        monthKeyFromDateString(p.payPeriod?.split(" - ")[0]) ?? monthKeyFromDateString(p.payDate);
      return key === currentMonthKey;
    })
    .reduce((sum, p) => sum + (p.grossEarnings || 0), 0);

  const timesheetsAwaitingAction = input.timesheets.filter(
    (t) => t.status === "Draft" || t.status === "Submitted"
  ).length;

  return {
    employeeCount: input.employeeCount,
    payslipCount: input.payslips.length,
    pendingTodoCount: input.pendingTodoCount,
    timesheetsAwaitingAction,
    currentMonthGrossPayroll,
    setupReadyCount: computeSetupReadyCount(input),
    setupTotal: 3,
  };
}
