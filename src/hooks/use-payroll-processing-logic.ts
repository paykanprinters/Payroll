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
import { TaxTables } from "./use-tax-tables"; // Import TaxTables interface

export const usePayrollProcessingLogic = (
  employees: MockEmployee[],
  payslips: MockPayslip[], // Keep as input for YTD calculation
  loans: Loan[], // Keep as input for initial state
  savingPlans: SavingPlan[], // Keep as input for initial state
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[], // Keep as input for initial state
  taxTables: TaxTables | null,
  setPayslips: React.Dispatch<React.SetStateAction<MockPayslip[]>>,
  updateLoan: (loan: Loan) => Promise<void>, // New: function to update a single loan
  updateSavingPlan: (plan: SavingPlan) => Promise<void>, // New: function to update a single saving plan
  updateTimesheetStatus: (id: string, newStatus: TimesheetEntry["status"]) => Promise<void>, // New: function to update timesheet status
) => {

  const runPayrollProcess = useCallback(
    async (periodStart: Date, periodEnd: Date) => { // Made async
      if (!employees.length) {
        showError("No employees found to run payroll.");
        return;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot run payroll.");
        return;
      }

      // 1. Generate payslips for the period, and get updated loans/saving plans
      const { payslips: newPayslips, updatedLoans, updatedSavingPlans } = generatePayslipsForPeriod(
        employees,
        loans, // Pass immutable current loans
        savingPlans, // Pass immutable current saving plans
        leaveRecords,
        timesheets,
        periodStart,
        periodEnd,
        taxTables
      );

      if (newPayslips.length === 0) {
        showError("No payslips generated for this period. Check employee data and timesheets.");
        return;
      }

      // 2. Update YTD for new payslips and merge with existing
      const updatedAllPayslips = [...payslips]; // Start with existing payslips
      newPayslips.forEach(newPayslip => {
        const employeePayslips = updatedAllPayslips.filter(p => p.employeeId === newPayslip.employeeId);
        const lastPayslipForEmployee = employeePayslips.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];

        newPayslip.ytdGrossEarnings = (lastPayslipForEmployee?.ytdGrossEarnings || 0) + newPayslip.grossEarnings;
        newPayslip.ytdTotalDeductions = (lastPayslipForEmployee?.ytdTotalDeductions || 0) + newPayslip.totalDeductions;

        // Remove any existing payslip for the same employee and period before adding the new one
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

      // 3. Update loans and saving plans using their respective update functions
      for (const loan of updatedLoans) {
        await updateLoan(loan);
      }
      for (const plan of updatedSavingPlans) {
        await updateSavingPlan(plan);
      }

      // 4. Lock timesheets for the processed period
      const timesheetUpdatePromises = timesheets.map(async (ts) => {
        const tsDate = parseISO(ts.date);
        if (
          ts.employeeId &&
          ts.status !== "Locked" && // Only lock if not already locked
          isWithinInterval(tsDate, { start: periodStart, end: periodEnd })
        ) {
          await updateTimesheetStatus(ts.id, "Locked");
        }
      });
      await Promise.all(timesheetUpdatePromises);


      // 5. Save all updated data to localStorage (only for mock data)
      // In a real app, this would be API calls to backend
      // These localStorage updates are now handled by the individual update functions (updateLoan, updateSavingPlan, updateTimesheetStatus)
      // For payslips, it's still a local state in usePayrollProcessor, so update it directly.
      localStorage.setItem("mockPayslips", JSON.stringify(updatedAllPayslips));


      // 6. Update state and notify components
      setPayslips(updatedAllPayslips);
      // Dispatch specific events instead of a general 'mockDataUpdated'
      window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: updatedAllPayslips }));
      // loans, savingPlans, timesheets events are dispatched by their respective update functions
      showSuccess(`Payroll for ${format(periodStart, "MMM yyyy")} processed successfully!`);
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables, setPayslips, updateLoan, updateSavingPlan, updateTimesheetStatus]
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

      // For preview, we don't want to modify the actual loans/savingPlans/timesheets state
      // So, we pass immutable copies to generatePayslipsForPeriod
      const { payslips: previewPayslips } = generatePayslipsForPeriod(
        [employee], // Only generate for the selected employee
        loans, // Pass immutable current loans
        savingPlans, // Pass immutable current saving plans
        leaveRecords,
        timesheets,
        periodStart,
        periodEnd,
        taxTables // Pass tax tables
      );

      if (previewPayslips.length > 0) {
        const previewPayslip = previewPayslips[0];

        // Calculate YTD for the preview based on existing payslips
        const employeePayslips = payslips.filter(p => p.employeeId === employeeId);
        const lastPayslipForEmployee = employeePayslips.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];

        previewPayslip.ytdGrossEarnings = (lastPayslipForEmployee?.ytdGrossEarnings || 0) + previewPayslip.grossEarnings;
        previewPayslip.ytdTotalDeductions = (lastPayslipForEmployee?.ytdTotalDeductions || 0) + previewPayslip.totalDeductions;

        return previewPayslip;
      }
      return null;
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables]
  );

  return {
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};