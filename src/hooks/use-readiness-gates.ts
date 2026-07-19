"use client";

import type { MockCompanyDetails, MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import type { TaxTables } from "@/hooks/use-tax-tables";
import {
  buildReminderPayload,
  canApprovePayrollRun,
  canGeneratePayrollItems,
  computePayrollRunBlockers,
  isPastCutOff,
  type ReadinessBlocker,
  type ReadinessBlockerType,
} from "@/lib/payroll-readiness";

export type { ReadinessBlocker, ReadinessBlockerType };

export const useReadinessGates = () => {
  const computeBlockers = (
    employees: MockEmployee[],
    timesheets: TimesheetEntry[],
    companyDetails: MockCompanyDetails | null,
    userTaxSettings: UserTaxSettings | null,
    periodStart: Date,
    periodEnd: Date,
    taxTables: TaxTables | null = null,
    activeTaxYear: number = new Date().getFullYear()
  ): ReadinessBlocker[] =>
    computePayrollRunBlockers({
      employees,
      timesheets,
      companyDetails,
      userTaxSettings,
      periodStart,
      periodEnd,
      taxTables,
      activeTaxYear,
    });

  return {
    computeBlockers,
    isPastCutOff,
    buildReminderPayload,
    canGeneratePayrollItems,
    canApprovePayrollRun,
  };
};
