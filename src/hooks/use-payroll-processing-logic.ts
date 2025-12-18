"use client";

import { useCallback } from "react";
import {
  format,
  isWithinInterval,
  parseISO,
} from "date-fns";
import {
  MockEmployee,
  MockPayslip,
  Loan,
  SavingPlan,
  LeaveEntry,
  TimesheetEntry,
} from "@/lib/mock-data-interfaces";
import { generatePayslipsForPeriod } from "@/lib/payroll-calculations/payslip-generator";
import { showError, showSuccess } from "@/utils/toast";
import { TaxTables } from "./use-tax-tables";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";

import type { PublicHoliday } from "@/hooks/use-public-holidays";

export const usePayrollProcessingLogic = (
  employees: MockEmployee[],
  payslips: MockPayslip[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  taxTables: TaxTables | null,
  userTaxSettings: UserTaxSettings | null,
  payrollSavingsEntries: PayrollSavingsEntry[] | null,
  workHoursSettings: WorkHoursSettings | null,
  publicHolidays: PublicHoliday[] | null,
  setPayslips: React.Dispatch<React.SetStateAction<MockPayslip[]>>,
  updateLoan: (loan: Loan) => Promise<void>,
  updateSavingPlan: (plan: SavingPlan) => Promise<void>,
  updateTimesheetStatus: (id: string, newStatus: TimesheetEntry["status"]) => Promise<void>,
  batchUpsertPayslips: (payslips: MockPayslip[]) => Promise<boolean>,
  recordSavingsPayment: (planId: string, amount: number) => Promise<void>,
  isMockDataEnabled: boolean,
) => {

  const runPayrollProcess = useCallback(
    async (periodStart: Date, periodEnd: Date) => {
      if (!employees.length) {
        showError("No employees found to run payroll.");
        return;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot run payroll.");
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
        publicHolidays || []
      );

      if (newPayslips.length === 0) {
        showError("No payslips generated for this period. Check employee data and timesheets.");
        return;
      }

      const parsePeriodStart = (period: string) => {
        const [startStr] = period.split(' - ');
        return parseISO(startStr);
      };

      const updatedPayslipsWithYTD = newPayslips.map(newPayslip => {
        const currentStart = parsePeriodStart(newPayslip.payPeriod);
        const employeePayslips = payslips.filter(p => p.employeeId === newPayslip.employeeId);

        // Only include payslips strictly before this period
        const previousPayslips = employeePayslips.filter(p => parsePeriodStart(p.payPeriod) < currentStart);

        const prevYtdGross = previousPayslips.reduce((sum, p) => sum + (p.grossEarnings || 0), 0);
        const prevYtdDeductions = previousPayslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

        return {
          ...newPayslip,
          ytdGrossEarnings: prevYtdGross + newPayslip.grossEarnings,
          ytdTotalDeductions: prevYtdDeductions + newPayslip.totalDeductions,
        };
      });

      if (isMockDataEnabled) {
        const updatedAllPayslips = [...payslips];
        updatedPayslipsWithYTD.forEach(newPayslip => {
          const existingPayslipIndex = updatedAllPayslips.findIndex(p =>
            p.employeeId === newPayslip.employeeId &&
            p.payPeriod === newPayslip.payPeriod
          );
          if (existingPayslipIndex !== -1) {
            updatedAllPayslips[existingPayslipIndex] = newPayslip;
          } else {
            updatedAllPayslips.push(newPayslip);
          }
        });
        localStorage.setItem("mockPayslips", JSON.stringify(updatedAllPayslips));
        setPayslips(updatedAllPayslips);
        window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: updatedAllPayslips }));
      } else {
        const success = await batchUpsertPayslips(updatedPayslipsWithYTD);
        if (!success) {
          showError("Failed to save payslips to database.");
          return;
        }
      }

      for (const loan of updatedLoans) {
        await updateLoan(loan);
      }
      for (const plan of updatedSavingPlans) {
        await updateSavingPlan(plan);
      }

      if (!isMockDataEnabled) {
        for (const payment of savingPaymentsToRecord) {
          await recordSavingsPayment(payment.planId, payment.amount);
        }
      }

      const timesheetUpdatePromises = timesheets.map(async (ts) => {
        const tsDate = parseISO(ts.date);
        if (
          ts.employeeId &&
          ts.status !== "Locked" &&
          isWithinInterval(tsDate, { start: periodStart, end: periodEnd })
        ) {
          await updateTimesheetStatus(ts.id, "Locked");
        }
      });
      await Promise.all(timesheetUpdatePromises);

      showSuccess(`Payroll for ${format(periodStart, "MMM yyyy")} processed successfully!`);
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables, userTaxSettings, payrollSavingsEntries, workHoursSettings, publicHolidays, setPayslips, updateLoan, updateSavingPlan, updateTimesheetStatus, batchUpsertPayslips, recordSavingsPayment, isMockDataEnabled]
  );

  const calculateSinglePayslipPreview = useCallback(
    (employeeId: string, periodStart: Date, periodEnd: Date): MockPayslip | null => {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) {
        showError("Employee not found for payslip preview.");
        return null;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot generate payslip preview.");
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
        publicHolidays || []
      );

      if (previewPayslips.length > 0) {
        const previewPayslip = previewPayslips[0];

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
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables, userTaxSettings, payrollSavingsEntries, workHoursSettings, publicHolidays, isMockDataEnabled]
  );

  return {
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};