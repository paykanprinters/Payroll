"use client";

import { MockEmployee, TimesheetEntry, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";

export type ReadinessBlockerType = 'BANK_INFO' | 'TAX_INFO' | 'TIMESHEET_DRAFT' | 'MISSING_TIMESHEET';
export interface ReadinessBlocker {
  type: ReadinessBlockerType;
  employeeId?: string;
  message: string;
  severity: 'error' | 'warning';
}

export const useReadinessGates = () => {
  const hasBankInfo = (e: MockEmployee) =>
    !!e.bankName && !!e.bankAccountHolder && !!e.accountNumber && !!e.branchCode;

  const hasTaxInfo = (e: MockEmployee, company: MockCompanyDetails | null, userTax: UserTaxSettings | null) => {
    const employeeTaxOk = !!e.taxReferenceNumber;
    const companyTaxOk = !!company?.companyTaxNumber;
    const applyPAYE = userTax?.applyPaye ?? false;
    // Only require tax info if PAYE applies
    return applyPAYE ? (employeeTaxOk && companyTaxOk) : true;
  };

  const isWithinPeriod = (dateIso: string, start: Date, end: Date) => {
    const d = new Date(dateIso);
    const sd = new Date(start);
    const ed = new Date(end);
    sd.setHours(0,0,0,0);
    ed.setHours(23,59,59,999);
    return d >= sd && d <= ed;
  };

  const computeBlockers = (
    employees: MockEmployee[],
    timesheets: TimesheetEntry[],
    companyDetails: MockCompanyDetails | null,
    userTaxSettings: UserTaxSettings | null,
    periodStart: Date,
    periodEnd: Date
  ): ReadinessBlocker[] => {
    const blockers: ReadinessBlocker[] = [];

    employees.forEach((e) => {
      if (!hasBankInfo(e)) {
        blockers.push({
          type: 'BANK_INFO',
          employeeId: e.id,
          severity: 'error',
          message: `Missing bank info for ${e.firstName} ${e.lastName}`,
        });
      }

      if (!hasTaxInfo(e, companyDetails, userTaxSettings)) {
        blockers.push({
          type: 'TAX_INFO',
          employeeId: e.id,
          severity: 'error',
          message: `Missing tax info for ${e.firstName} ${e.lastName} or company`,
        });
      }

      const tsForEmployeeInPeriod = timesheets.filter(
        (ts) => ts.employeeId === e.id && isWithinPeriod(ts.date, periodStart, periodEnd)
      );

      if (tsForEmployeeInPeriod.length === 0) {
        blockers.push({
          type: 'MISSING_TIMESHEET',
          employeeId: e.id,
          severity: 'warning',
          message: `No timesheets in period for ${e.firstName} ${e.lastName}`,
        });
      } else {
        const hasDraft = tsForEmployeeInPeriod.some((ts) => ts.status === 'Draft');
        if (hasDraft) {
          blockers.push({
            type: 'TIMESHEET_DRAFT',
            employeeId: e.id,
            severity: 'warning',
            message: `Draft timesheets present for ${e.firstName} ${e.lastName}`,
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
    blockers.forEach(b => {
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