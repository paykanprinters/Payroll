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
  LoanDeductionHistoryEntry,
} from "@/lib/mock-data-interfaces";
import { generatePayslipsForPeriod } from "@/lib/mock-data-generators";
import { showError, showSuccess } from "@/utils/toast";
import { TaxTables } from "./use-tax-tables";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries"; // New import

export const usePayrollProcessingLogic = (
  employees: MockEmployee[],
  payslips: MockPayslip[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  taxTables: TaxTables | null,
  userTaxSettings: UserTaxSettings | null, // New parameter for user tax settings
  setPayslips: React.Dispatch<React.SetStateAction<MockPayslip[]>>, // For mock data
  updateLoan: (loan: Loan) => Promise<void>,
  updateSavingPlan: (plan: SavingPlan) => Promise<void>,
  updateTimesheetStatus: (id: string, newStatus: TimesheetEntry["status"]) => Promise<void>,
  batchUpsertPayslips: (payslips: MockPayslip[]) => Promise<boolean>, // New prop for live data
  isMockDataEnabled: boolean, // New prop to determine data source
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

      console.log(`[usePayrollProcessingLogic] runPayrollProcess called. isMockDataEnabled: ${isMockDataEnabled}`);
      console.log("[usePayrollProcessingLogic] Period Start:", format(periodStart, 'yyyy-MM-dd'));
      console.log("[usePayrollProcessingLogic] Period End:", format(periodEnd, 'yyyy-MM-dd'));
      console.log("[usePayrollProcessingLogic] Tax Tables received:", taxTables);
      console.log("[usePayrollProcessingLogic] User Tax Settings received:", userTaxSettings);
      console.log("[usePayrollProcessingLogic] runPayrollProcess: Number of employees to process:", employees.length);


      const { payslips: newPayslips, updatedLoans, updatedSavingPlans } = generatePayslipsForPeriod(
        employees,
        loans,
        savingPlans,
        leaveRecords,
        timesheets,
        periodStart,
        periodEnd,
        taxTables,
        userTaxSettings // Pass user tax settings
      );

      if (newPayslips.length === 0) {
        showError("No payslips generated for this period. Check employee data and timesheets.");
        return;
      }

      const updatedPayslipsWithYTD = newPayslips.map(newPayslip => {
        const employeePayslips = payslips.filter(p => p.employeeId === newPayslip.employeeId);
        const lastPayslipForEmployee = employeePayslips.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];

        return {
          ...newPayslip,
          ytdGrossEarnings: (lastPayslipForEmployee?.ytdGrossEarnings || 0) + newPayslip.grossEarnings,
          ytdTotalDeductions: (lastPayslipForEmployee?.ytdTotalDeductions || 0) + newPayslip.totalDeductions,
        };
      });

      // 1. Persist Payslips
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
        // refetchPayslips will be called by usePayslipsData after batchUpsertPayslips
      }

      // 2. Update loans and saving plans
      for (const loan of updatedLoans) {
        await updateLoan(loan);
      }
      for (const plan of updatedSavingPlans) {
        await updateSavingPlan(plan);
      }

      // 3. Lock timesheets for the processed period
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
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables, userTaxSettings, setPayslips, updateLoan, updateSavingPlan, updateTimesheetStatus, batchUpsertPayslips, isMockDataEnabled]
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

      console.log(`[usePayrollProcessingLogic] calculateSinglePayslipPreview called. isMockDataEnabled: ${isMockDataEnabled}`);
      console.log("[usePayrollProcessingLogic] Employee ID:", employeeId);
      console.log("[usePayrollProcessingLogic] Period Start:", format(periodStart, 'yyyy-MM-dd'));
      console.log("[usePayrollProcessingLogic] Period End:", format(periodEnd, 'yyyy-MM-dd'));
      console.log("[usePayrollProcessingLogic] Tax Tables received for preview:", taxTables);
      console.log("[usePayrollProcessingLogic] User Tax Settings received for preview:", userTaxSettings);

      const { payslips: previewPayslips } = generatePayslipsForPeriod(
        [employee],
        loans,
        savingPlans,
        leaveRecords,
        timesheets,
        periodStart,
        periodEnd,
        taxTables,
        userTaxSettings // Pass user tax settings
      );

      if (previewPayslips.length > 0) {
        const previewPayslip = previewPayslips[0];

        const employeePayslips = payslips.filter(p => p.employeeId === employeeId);
        const lastPayslipForEmployee = employeePayslips.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];

        previewPayslip.ytdGrossEarnings = (lastPayslipForEmployee?.ytdGrossEarnings || 0) + previewPayslip.grossEarnings;
        previewPayslip.ytdTotalDeductions = (lastPayslipForEmployee?.ytdTotalDeductions || 0) + previewPayslip.totalDeductions;

        return previewPayslip;
      }
      return null;
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables, userTaxSettings, isMockDataEnabled]
  );

  return {
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};