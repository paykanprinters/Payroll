"use client";

import { MockEmployee, TimesheetEntry, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";

import type { TaxTables } from "@/hooks/use-tax-tables";
import {
  getTaxTableBlockingMessage,
  validateLoadedTaxTables,
} from "@/lib/tax-tables-validation";

export type ReadinessBlockerType =
  | "BANK_INFO"
  | "EMPLOYEE_TAX_INFO"
  | "COMPANY_TAX_INFO"
  | "TIMESHEET_DRAFT"
  | "MISSING_TIMESHEET"
  | "TAX_TABLES";

export type ReadinessBlocker = {
  type: ReadinessBlockerType;
  employeeId?: string;
  message: string;
  severity: "error" | "warning";
  meta?: {
    missingFields?: string[];
    periodStart?: string;
    periodEnd?: string;
  };
};

export const useReadinessGates = () => {
  const missingBankFields = (e: MockEmployee): string[] => {
    const missing: string[] = [];
    if (!e.bankName) missing.push("bankName");
    if (!e.bankAccountHolder) missing.push("bankAccountHolder");
    if (!e.accountNumber) missing.push("accountNumber");
    if (!e.branchCode) missing.push("branchCode");
    return missing;
  };

  const isWithinPeriod = (dateIso: string, start: Date, end: Date) => {
    const d = new Date(dateIso);
    const sd = new Date(start);
    const ed = new Date(end);
    sd.setHours(0, 0, 0, 0);
    ed.setHours(23, 59, 59, 999);
    return d >= sd && d <= ed;
  };

  const computeBlockers = (
    employees: MockEmployee[],
    timesheets: TimesheetEntry[],
    companyDetails: MockCompanyDetails | null,
    userTaxSettings: UserTaxSettings | null,
    periodStart: Date,
    periodEnd: Date,
    taxTables: TaxTables | null = null,
    activeTaxYear: number = new Date().getFullYear()
  ): ReadinessBlocker[] => {
    const blockers: ReadinessBlocker[] = [];

    const applyPAYE = userTaxSettings?.applyPaye ?? false;
    const companyTaxOk = !!companyDetails?.companyTaxNumber;

    if (applyPAYE && !companyTaxOk) {
      blockers.push({
        type: "COMPANY_TAX_INFO",
        severity: "error",
        message: "Company tax number is missing (required when PAYE applies).",
      });
    }

    if (applyPAYE) {
      const taxValidation = validateLoadedTaxTables(taxTables, activeTaxYear);
      if (!taxValidation.isReady) {
        blockers.push({
          type: "TAX_TABLES",
          severity: taxValidation.status === "stale" ? "warning" : "error",
          message:
            getTaxTableBlockingMessage(taxValidation) ??
            `Tax tables for ${activeTaxYear} are not ready for payroll.`,
        });
      }
    }

    employees.forEach((e) => {
      const missingBank = missingBankFields(e);
      if (missingBank.length > 0) {
        blockers.push({
          type: "BANK_INFO",
          employeeId: e.id,
          severity: "error",
          message: `Missing bank info for ${e.firstName} ${e.lastName}`,
          meta: { missingFields: missingBank },
        });
      }

      const employeeTaxOk = !!e.taxReferenceNumber;
      if (applyPAYE && !employeeTaxOk) {
        blockers.push({
          type: "EMPLOYEE_TAX_INFO",
          employeeId: e.id,
          severity: "error",
          message: `Missing tax reference number for ${e.firstName} ${e.lastName}`,
          meta: { missingFields: ["taxReferenceNumber"] },
        });
      }

      const tsForEmployeeInPeriod = timesheets.filter(
        (ts) => ts.employeeId === e.id && isWithinPeriod(ts.date, periodStart, periodEnd)
      );

      if (tsForEmployeeInPeriod.length === 0) {
        blockers.push({
          type: "MISSING_TIMESHEET",
          employeeId: e.id,
          severity: "warning",
          message: `No timesheets in period for ${e.firstName} ${e.lastName}`,
          meta: {
            periodStart: periodStart.toISOString().slice(0, 10),
            periodEnd: periodEnd.toISOString().slice(0, 10),
          },
        });
      } else {
        const hasDraft = tsForEmployeeInPeriod.some((ts) => ts.status === "Draft");
        if (hasDraft) {
          blockers.push({
            type: "TIMESHEET_DRAFT",
            employeeId: e.id,
            severity: "warning",
            message: `Draft timesheets present for ${e.firstName} ${e.lastName}`,
            meta: {
              periodStart: periodStart.toISOString().slice(0, 10),
              periodEnd: periodEnd.toISOString().slice(0, 10),
            },
          });
        }
      }
    });

    return blockers;
  };

  const isPastCutOff = (periodEnd: Date): boolean => {
    const now = new Date();
    return now.getTime() > periodEnd.getTime();
  };

  const buildReminderPayload = (blockers: ReadinessBlocker[]) => {
    // Group by employee and summarize messages
    const perEmp = new Map<string, string[]>();
    blockers.forEach((b) => {
      if (b.employeeId) {
        const arr = perEmp.get(b.employeeId) || [];
        arr.push(b.message);
        perEmp.set(b.employeeId, arr);
      }
    });
    return Array.from(perEmp.entries()).map(([employeeId, messages]) => ({
      employeeId,
      messages,
    }));
  };

  return {
    computeBlockers,
    isPastCutOff,
    buildReminderPayload,
  };
};