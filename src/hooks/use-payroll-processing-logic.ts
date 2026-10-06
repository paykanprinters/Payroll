"use client";

import { useCallback } from "react";
import {
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  MockEmployee,
  MockPayslip,
  Loan,
  SavingPlan,
  LeaveEntry,
  TimesheetEntry,
  MockCompanyDetails,
} from "@/lib/mock-data-interfaces";
import { generatePayslipsForPeriod } from "@/lib/payroll-calculations/payslip-generator";
import { formatPayrollPeriod, payslipsForPayrollPeriod } from "@/lib/payroll-period-guard";
import { deletePayslipsByIds } from "@/integrations/supabase/payslip-queries";
import { deleteRunItemsForPayslips } from "@/integrations/supabase/payroll-run-queries";
import { showError, showSuccess } from "@/utils/toast";
import { TaxTables } from "./use-tax-tables";
import type { TaxTableValidationResult } from "@/lib/tax-tables-validation";
import { getTaxTableBlockingMessage } from "@/lib/tax-tables-validation";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import type { PublicHoliday } from "@/hooks/use-public-holidays";
import type { OvertimePremiumRules } from "@/lib/payroll-calculations/helpers/earnings-helpers";
import type {
  DeductionComponent,
  EarningComponent,
  EmployeeComponentAssignment,
} from "@/integrations/supabase/compensation-queries";

export const usePayrollProcessingLogic = (
  employees: MockEmployee[],
  payslips: MockPayslip[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  taxTables: TaxTables | null,
  taxTableValidation: TaxTableValidationResult | null,
  isLoadingTaxTables: boolean,
  userTaxSettings: UserTaxSettings | null,
  payrollSavingsEntries: PayrollSavingsEntry[] | null,
  workHoursSettings: WorkHoursSettings | null,
  publicHolidays: PublicHoliday[] | null,
  companyDetails: MockCompanyDetails | null,
  setPayslips: React.Dispatch<React.SetStateAction<MockPayslip[]>>,
  updateLoan: (loan: Loan) => Promise<void>,
  updateSavingPlan: (plan: SavingPlan) => Promise<void | boolean>,
  updateTimesheetStatus: (
    id: string,
    newStatus: TimesheetEntry["status"],
    options?: { silent?: boolean }
  ) => Promise<boolean>,
  batchUpsertPayslips: (payslips: MockPayslip[]) => Promise<boolean>,
  recordSavingsPayment: (planId: string, amount: number, payPeriod?: string | null) => Promise<void>,
  isMockDataEnabled: boolean,
  // Phase 3 inputs (forwarded to generator)
  earningComponents?: EarningComponent[],
  deductionComponents?: DeductionComponent[],
  assignments?: EmployeeComponentAssignment[],
  overtimeRules?: OvertimePremiumRules
) => {

  const runPayrollProcess = useCallback(
    async (periodStart: Date, periodEnd: Date, options?: { replaceExisting?: boolean }) => {
      if (!employees.length) {
        showError("No employees found to run payroll.");
        return;
      }
      if (isLoadingTaxTables || taxTableValidation?.status === "loading") {
        showError("Tax tables are still loading. Try again in a moment.");
        return;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot run payroll.");
        return;
      }
      if (taxTableValidation && !taxTableValidation.isReady) {
        showError(
          getTaxTableBlockingMessage(taxTableValidation) ??
            "Tax tables are not ready. Apply or refresh them in Settings > Tax Liabilities."
        );
        return;
      }
      if (!userTaxSettings) {
        showError("User tax settings not loaded. Cannot run payroll.");
        return;
      }

      const { payslips: newPayslips, updatedLoans, updatedSavingPlans, savingPaymentsToRecord } = generatePayslipsForPeriod(
        employees,
        loans,
        savingPlans,
        leaveRecords,
        timesheets,
        periodStart,
        periodEnd,
        taxTables,
        userTaxSettings,
        payrollSavingsEntries,
        workHoursSettings,
        publicHolidays || [],
        earningComponents || [],
        deductionComponents || [],
        assignments || [],
        overtimeRules
      );
      const newPayslipsWithBranding = newPayslips.map(p => ({
        ...p,
        companyName: companyDetails ? (companyDetails.companyTradingName || companyDetails.companyLegalName) : undefined,
        companyAddress: companyDetails?.physicalAddress,
        companyLogoUrl: companyDetails?.logoUrl,
      }));

      if (newPayslips.length === 0) {
        showError("No payslips generated for this period. Check employee data and timesheets.");
        return;
      }

      const periodKey = formatPayrollPeriod(periodStart, periodEnd);
      const existingForPeriod = payslipsForPayrollPeriod(payslips, periodStart, periodEnd);
      if (existingForPeriod.length > 0 && !options?.replaceExisting) {
        showError("Payslips already exist for this pay period. Stop, or replace the existing set.");
        return;
      }

      const parsePeriodStart = (period: string) => {
        const [startStr] = period.split(' - ');
        return parseISO(startStr);
      };

      const updatedPayslipsWithYTD = newPayslipsWithBranding.map(newPayslip => {
        const currentStart = parsePeriodStart(newPayslip.payPeriod);
        const employeePayslips = payslips.filter(p => p.employeeId === newPayslip.employeeId);

        const previousPayslips = employeePayslips.filter(p => parsePeriodStart(p.payPeriod) < currentStart);

        const prevYtdGross = previousPayslips.reduce((sum, p) => sum + (p.grossEarnings || 0), 0);
        const prevYtdDeductions = previousPayslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

        return {
          ...newPayslip,
          ytdGrossEarnings: prevYtdGross + newPayslip.grossEarnings,
          ytdTotalDeductions: prevYtdDeductions + newPayslip.totalDeductions,
        };
      });

      const reusedIds = new Set<string>();
      const payslipsToSave = updatedPayslipsWithYTD.map((newPayslip) => {
        const match = existingForPeriod.find(
          (existing) => existing.employeeId === newPayslip.employeeId && !reusedIds.has(existing.id)
        );
        if (!match) return newPayslip;
        reusedIds.add(match.id);
        return { ...newPayslip, id: match.id };
      });
      const leftoverIds = existingForPeriod.map((existing) => existing.id).filter((id) => !reusedIds.has(id));

      if (isMockDataEnabled) {
        const updatedAllPayslips = [
          ...payslips.filter((payslip) => payslip.payPeriod !== periodKey),
          ...payslipsToSave,
        ];
        localStorage.setItem("mockPayslips", JSON.stringify(updatedAllPayslips));
        setPayslips(updatedAllPayslips);
        window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: updatedAllPayslips }));
      } else {
        if (leftoverIds.length > 0) {
          const itemsCleared = await deleteRunItemsForPayslips(leftoverIds);
          const duplicatesCleared = itemsCleared && (await deletePayslipsByIds(leftoverIds));
          if (!duplicatesCleared) {
            showError("Could not remove the extra payslips for this period.");
            return;
          }
        }
        const success = await batchUpsertPayslips(payslipsToSave);
        if (!success) {
          showError("Failed to save payslips to database.");
          return;
        }
      }

      await Promise.all([
        ...updatedLoans.map((loan) => updateLoan(loan)),
        ...updatedSavingPlans.map((plan) => updateSavingPlan(plan)),
      ]);

      if (!isMockDataEnabled && !options?.replaceExisting) {
        for (const payment of savingPaymentsToRecord) {
          await recordSavingsPayment(payment.planId, payment.amount, format(periodEnd, "yyyy-MM-dd"));
        }
      }

      const periodWindow = { start: startOfDay(periodStart), end: endOfDay(periodEnd) };
      const timesheetsToLock = timesheets.filter((ts) => {
        if (!ts.employeeId || ts.status === "Locked") return false;
        return isWithinInterval(parseISO(ts.date), periodWindow);
      });
      const lockResults = await Promise.all(
        timesheetsToLock.map((ts) => updateTimesheetStatus(ts.id, "Locked", { silent: true }))
      );
      const lockFailures = lockResults.filter((ok) => !ok).length;

      if (lockFailures > 0) {
        showError(
          `Payslips for ${periodKey} were saved, but ${lockFailures} timesheet${lockFailures === 1 ? "" : "s"} could not be locked.`
        );
        return;
      }

      showSuccess(
        options?.replaceExisting
          ? `Replaced payslips for ${periodKey} and locked the timesheets.`
          : `Payroll for ${periodKey} processed successfully.`
      );
    },
    [
      employees,
      payslips,
      loans,
      savingPlans,
      leaveRecords,
      timesheets,
      taxTables,
      taxTableValidation,
      isLoadingTaxTables,
      userTaxSettings,
      payrollSavingsEntries,
      workHoursSettings,
      publicHolidays,
      companyDetails,
      setPayslips,
      updateLoan,
      updateSavingPlan,
      updateTimesheetStatus,
      batchUpsertPayslips,
      recordSavingsPayment,
      isMockDataEnabled,
      earningComponents,
      deductionComponents,
      assignments,
      overtimeRules,
    ]
  );

  const calculateSinglePayslipPreview = useCallback(
    (employeeId: string, periodStart: Date, periodEnd: Date): MockPayslip | null => {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) {
        showError("Employee not found for payslip preview.");
        return null;
      }
      // Dashboard and other auto-previews race tax-table fetch — stay quiet while loading.
      if (isLoadingTaxTables || taxTableValidation?.status === "loading") {
        return null;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot generate payslip preview.");
        return null;
      }
      if (taxTableValidation && !taxTableValidation.isReady) {
        const blocking = getTaxTableBlockingMessage(taxTableValidation);
        if (blocking) {
          showError(blocking);
        }
        return null;
      }
      if (!userTaxSettings) {
        showError("User tax settings not loaded. Cannot generate payslip preview.");
        return null;
      }

      const { payslips: previewPayslips } = generatePayslipsForPeriod(
        [employee],
        loans,
        savingPlans,
        leaveRecords,
        timesheets,
        periodStart,
        periodEnd,
        taxTables,
        userTaxSettings,
        payrollSavingsEntries,
        workHoursSettings,
        publicHolidays || [],
        earningComponents || [],
        deductionComponents || [],
        assignments || [],
        overtimeRules
      );
      const previewPayslipsWithBranding = previewPayslips.map(p => ({
        ...p,
        companyName: companyDetails ? (companyDetails.companyTradingName || companyDetails.companyLegalName) : undefined,
        companyAddress: companyDetails?.physicalAddress,
        companyLogoUrl: companyDetails?.logoUrl,
      }));

      if (previewPayslipsWithBranding.length > 0) {
        const previewPayslip = previewPayslipsWithBranding[0];

        const parsePeriodStart = (period: string) => {
          const [startStr] = period.split(' - ');
          return parseISO(startStr);
        };

        const employeePayslips = payslips.filter(p => p.employeeId === employeeId);
        const currentStart = parsePeriodStart(previewPayslip.payPeriod);
        const previousPayslips = employeePayslips.filter(p => parsePeriodStart(p.payPeriod) < currentStart);

        const prevYtdGross = previousPayslips.reduce((sum, p) => sum + (p.grossEarnings || 0), 0);
        const prevYtdDeductions = previousPayslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

        previewPayslip.ytdGrossEarnings = prevYtdGross + previewPayslip.grossEarnings;
        previewPayslip.ytdTotalDeductions = prevYtdDeductions + previewPayslip.totalDeductions;

        return previewPayslip;
      }
      return null;
    },
    [
      employees,
      payslips,
      loans,
      savingPlans,
      leaveRecords,
      timesheets,
      taxTables,
      taxTableValidation,
      isLoadingTaxTables,
      userTaxSettings,
      payrollSavingsEntries,
      workHoursSettings,
      publicHolidays,
      companyDetails,
      earningComponents,
      deductionComponents,
      assignments,
      overtimeRules,
    ]
  );

  return {
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};