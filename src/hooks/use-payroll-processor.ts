"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isSameDay,
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
import { generatePayslipsForPeriod } from "@/lib/mock-data-generators";
import { showError, showSuccess } from "@/utils/toast";

export const usePayrollProcessor = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null);
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(false); // New state for mock data status

  const loadData = useCallback(() => {
    const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
    setIsMockDataEnabled(mockEnabled);

    if (mockEnabled) {
      setEmployees(JSON.parse(localStorage.getItem("mockEmployees") || "[]"));
      setPayslips(JSON.parse(localStorage.getItem("mockPayslips") || "[]"));
      setLoans(JSON.parse(localStorage.getItem("mockLoans") || "[]"));
      setSavingPlans(JSON.parse(localStorage.getItem("mockSavingPlans") || "[]"));
      setLeaveRecords(JSON.parse(localStorage.getItem("mockLeaveRecords") || "[]"));
      setTimesheets(JSON.parse(localStorage.getItem("mockTimesheets") || "[]"));

      const companyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
      const companyTradingName = localStorage.getItem('companyTradingName') || "";
      const companyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
      const vatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
      const physicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
      const postalAddress = localStorage.getItem('postalAddress') || "PO Box 123, Business Centre, 2001";
      const mainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
      const alternativeContactNumber = localStorage.getItem('alternativeContactNumber') || "";
      const companyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
      const companyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";
      const bankName = localStorage.getItem('bankName') || "";
      const accountHolderName = localStorage.getItem('accountHolderName') || "";
      const accountNumber = localStorage.getItem('accountNumber') || "";
      const branchCode = localStorage.getItem('branchCode') || "";
      const accountType = (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque";
      const logoUrl = localStorage.getItem('companyLogoUrl') || '';
      const logoSize = parseFloat(localStorage.getItem('companyLogoSize') || '40');

      setCompanyDetails({
        companyLegalName, companyTradingName, companyRegistrationNumber,
        companyTaxNumber: localStorage.getItem('companyTaxNumber') || "",
        vatRegistrationNumber, industry: localStorage.getItem('industry') || "",
        payeReferenceNumber: localStorage.getItem('payeReferenceNumber') || "",
        uifReferenceNumber: localStorage.getItem('uifReferenceNumber') || "",
        sdlReferenceNumber: localStorage.getItem('sdlReferenceNumber') || "",
        coidaRegistrationNumber: localStorage.getItem('coidaRegistrationNumber') || "",
        physicalAddress, postalAddress, mainContactNumber, alternativeContactNumber,
        companyEmail, companyWebsite, bankName, accountHolderName, accountNumber,
        branchCode, accountType, logoUrl, logoSize,
      });
    } else {
      // Clear all data if mock data is not enabled
      setEmployees([]);
      setPayslips([]);
      setLoans([]);
      setSavingPlans([]);
      setLeaveRecords([]);
      setTimesheets([]);
      setCompanyDetails(null);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("mockDataUpdated", loadData);
    return () => {
      window.removeEventListener("mockDataUpdated", loadData);
    };
  }, [loadData]);

  const runPayrollProcess = useCallback(
    (periodStart: Date, periodEnd: Date) => {
      if (!employees.length) {
        showError("No employees found to run payroll.");
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
        periodEnd
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

      // 4. Save all updated data to localStorage
      localStorage.setItem("mockPayslips", JSON.stringify(updatedAllPayslips));
      localStorage.setItem("mockLoans", JSON.stringify(currentLoansCopy));
      localStorage.setItem("mockSavingPlans", JSON.stringify(currentSavingPlansCopy));
      localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));

      // 5. Update state and notify components
      setPayslips(updatedAllPayslips);
      setLoans(currentLoansCopy);
      setSavingPlans(currentSavingPlansCopy);
      setTimesheets(updatedTimesheets);
      window.dispatchEvent(new Event("mockDataUpdated"));
      showSuccess(`Payroll for ${format(periodStart, "MMM yyyy")} processed successfully!`);
    },
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets]
  );

  const calculateSinglePayslipPreview = useCallback(
    (employeeId: string, periodStart: Date, periodEnd: Date): MockPayslip | null => {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) {
        showError("Employee not found for payslip preview.");
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
        periodEnd
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
    [employees, payslips, loans, savingPlans, leaveRecords, timesheets]
  );

  return {
    employees,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    companyDetails,
    isMockDataEnabled, // Expose mock data status
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};