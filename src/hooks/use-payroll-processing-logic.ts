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
  payslips: MockPayslip[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[],
  taxTables: TaxTables | null,
  setPayslips: React.Dispatch<React.SetStateAction<MockPayslip[]>>,
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>,
  setSavingPlans: React.Dispatch<React.SetStateAction<SavingPlan[]>>,
  setTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>,
) => {

  const runPayrollProcess = useCallback(
    (periodStart: Date, periodEnd: Date) => {
      if (!employees.length) {
        showError("No employees found to run payroll.");
        return;
      }
      if (!taxTables) {
        showError("Tax tables not loaded. Cannot run payroll.");
        return;
      }

      // Deep copy current mutable states for processing
      const currentLoansCopy: Loan[] = JSON.parse(JSON.stringify(loans));
      const currentSavingPlansCopy: SavingPlan[] = JSON.parse(JSON.stringify(savingPlans));
      const currentTimesheetsCopy: TimesheetEntry[] = JSON.parse(JSON.stringify(timesheets));

      // 1. Generate payslips for the period
      const newPayslips = generatePayslipsForPeriod(
        employees,
        currentLoansCopy, // Pass mutable copy
        currentSavingPlansCopy, // Pass mutable copy
        leaveRecords,
        currentTimesheetsCopy,
        periodStart,
        periodEnd,
        taxTables // Pass tax tables
      );

      if (newPayslips.length === 0) {
        showError("No payslips generated for this period. Check employee data and timesheets.");
        return;
      }

      // 2. Update YTD for new payslips and merge with existing
      const updatedAllPayslips = [...payslips];
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

      // 3. Lock timesheets for the processed period
      const updatedTimesheets = currentTimesheetsCopy.map((ts) => {
        const tsDate = parseISO(ts.date);
        if (
          ts.employeeId &&
          ts.status !== "Locked" && // Only lock if not already locked
          isWithinInterval(tsDate, { start: periodStart, end: periodEnd })
        ) {
          const auditEntry = {
            action: "Status changed to Locked (Payroll Run)",
            timestamp: new Date().toISOString(),
            user: "System (Payroll)",
            captureMethod: "System" as const,
          };
          return {
            ...ts,
            status: "Locked" as const,
            auditLog: [...(ts.auditLog || []), auditEntry],
          };
        }
        return ts;
      });

      // 4. Save all updated data to localStorage (only for mock data)
      // In a real app, this would be API calls to backend
      localStorage.setItem("mockPayslips", JSON.stringify(updatedAllPayslips));
      localStorage.setItem("mockLoans", JSON.stringify(currentLoansCopy)); // Save updated loans
      localStorage.setItem("mockSavingPlans", JSON.stringify(currentSavingPlansCopy));
      localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));

      // 5. Update state and notify components
      setPayslips(updatedAllPayslips);
      setLoans(currentLoansCopy); // Update loans state
      setSavingPlans(currentSavingPlansCopy);
      setTimesheets(updatedTimesheets);
      // Dispatch specific events instead of a general 'mockDataUpdated'
      window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: updatedAllPayslips }));
      window.dispatchEvent(new CustomEvent('loansUpdated', { detail: currentLoansCopy }));
      window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: currentSavingPlansCopy }));
      window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets }));
      showSuccess(`Payroll for ${format(periodStart, "MMM yyyy")} processed successfully!`);
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets, taxTables, setPayslips, setLoans, setSavingPlans, setTimesheets]
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

      // Deep copy current mutable states for preview (don't modify actual data)
      const currentLoansCopy: Loan[] = JSON.parse(JSON.stringify(loans));
      const currentSavingPlansCopy: SavingPlan[] = JSON.parse(JSON.stringify(savingPlans));
      const currentTimesheetsCopy: TimesheetEntry[] = JSON.parse(JSON.stringify(timesheets));

      const previewPayslips = generatePayslipsForPeriod(
        [employee], // Only generate for the selected employee
        currentLoansCopy,
        currentSavingPlansCopy,
        leaveRecords,
        currentTimesheetsCopy,
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