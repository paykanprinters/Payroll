"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  ToDoEntry, // Import ToDoEntry
} from "@/lib/mock-data-interfaces";
import { generatePayslipsForPeriod } from "@/lib/mock-data-generators";
import { showError, showSuccess } from "@/utils/toast";
import { useCompanyDetails } from "./use-company-details";

export const usePayrollProcessor = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [toDos, setToDos] = useState<ToDoEntry[]>([]); // Add toDos state
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(false);

  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails } = useCompanyDetails();

  // Load mock data from localStorage for company details
  const getMockCompanyDetailsFromLocalStorage = useCallback((): MockCompanyDetails | null => {
    if (!isMockDataEnabled) return null; // Only return mock details if enabled
    const mockCompanyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
    const mockCompanyTradingName = localStorage.getItem('companyTradingName') || "";
    const mockCompanyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
    const mockCompanyTaxNumber = localStorage.getItem('companyTaxNumber') || "";
    const mockVatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
    const mockIndustry = localStorage.getItem('industry') || "";
    const mockPayeReferenceNumber = localStorage.getItem('payeReferenceNumber') || "";
    const mockUifReferenceNumber = localStorage.getItem('uifReferenceNumber') || "";
    const mockSdlReferenceNumber = localStorage.getItem('sdlReferenceNumber') || "";
    const mockCoidaRegistrationNumber = localStorage.getItem('coidaRegistrationNumber') || "";
    const mockPhysicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
    const mockPostalAddress = localStorage.getItem('postalAddress') || "PO Box 123, Business Centre, 2001";
    const mockMainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
    const mockAlternativeContactNumber = localStorage.getItem('alternativeContactNumber') || "";
    const mockCompanyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
    const mockCompanyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";
    const mockBankName = localStorage.getItem('bankName') || "";
    const mockAccountholdername = localStorage.getItem('accountholdername') || "";
    const mockAccountNumber = localStorage.getItem('accountNumber') || "";
    const mockBranchCode = localStorage.getItem('branchCode') || "";
    const mockAccountType = (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque";
    const mockLogoUrl = localStorage.getItem('companyLogoUrl') || '';
    const mockLogoWidth = parseFloat(localStorage.getItem('companyLogoWidth') || '100');
    const mockLogoHeight = parseFloat(localStorage.getItem('companyLogoHeight') || '50');
    const mockLogoFit = (localStorage.getItem('companyLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || "contain";

    return {
      companyLegalName: mockCompanyLegalName, companyTradingName: mockCompanyTradingName, companyRegistrationNumber: mockCompanyRegistrationNumber,
      companyTaxNumber: mockCompanyTaxNumber, vatRegistrationNumber: mockVatRegistrationNumber, industry: mockIndustry,
      payeReferenceNumber: mockPayeReferenceNumber, uifReferenceNumber: mockUifReferenceNumber, sdlReferenceNumber: mockSdlReferenceNumber,
      coidaRegistrationNumber: mockCoidaRegistrationNumber, physicalAddress: mockPhysicalAddress, postalAddress: mockPostalAddress, mainContactNumber: mockMainContactNumber, alternativeContactNumber: mockAlternativeContactNumber,
      companyEmail: mockCompanyEmail, companyWebsite: mockCompanyWebsite, bankName: mockBankName, accountholdername: mockAccountholdername, accountNumber: mockAccountNumber,
      branchCode: mockBranchCode, accountType: mockAccountType, logoUrl: mockLogoUrl, logoWidth: mockLogoWidth, logoHeight: mockLogoHeight, logoFit: mockLogoFit,
    };
  }, [isMockDataEnabled]); // Dependency on isMockDataEnabled

  // Derived state for companyDetails: always reflects the correct source
  const companyDetails = useMemo(() => {
    if (isMockDataEnabled) {
      return getMockCompanyDetailsFromLocalStorage();
    }
    return supabaseCompanyDetails;
  }, [isMockDataEnabled, supabaseCompanyDetails, getMockCompanyDetailsFromLocalStorage]);


  // Effect for initial load and when mock data is toggled (full re-parse)
  useEffect(() => {
    const handleAllMockDataUpdate = () => {
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);

      if (mockEnabled) {
        setEmployees(JSON.parse(localStorage.getItem("mockEmployees") || "[]"));
        setPayslips(JSON.parse(localStorage.getItem("mockPayslips") || "[]"));
        setLoans(JSON.parse(localStorage.getItem("mockLoans") || "[]"));
        setSavingPlans(JSON.parse(localStorage.getItem("mockSavingPlans") || "[]"));
        setLeaveRecords(JSON.parse(localStorage.getItem("mockLeaveRecords") || "[]"));
        setTimesheets(JSON.parse(localStorage.getItem("mockTimesheets") || "[]"));
        setToDos(JSON.parse(localStorage.getItem("mockToDos") || "[]"));
      } else {
        // Clear all mock data if mock data is not enabled
        setEmployees([]);
        setPayslips([]);
        setLoans([]);
        setSavingPlans([]);
        setLeaveRecords([]);
        setTimesheets([]);
        setToDos([]);
      }
    };

    // Initial load
    handleAllMockDataUpdate();

    window.addEventListener("allMockDataUpdated", handleAllMockDataUpdate);
    window.addEventListener("companyDetailsUpdated", refetchCompanyDetails);
    return () => {
      window.removeEventListener("allMockDataUpdated", handleAllMockDataUpdate);
      window.removeEventListener("companyDetailsUpdated", refetchCompanyDetails);
    };
  }, [refetchCompanyDetails]); // Removed supabaseCompanyDetails from dependencies here, as companyDetails is now derived.

  // Individual listeners for specific data updates
  useEffect(() => {
    const handleEmployeesUpdated = (event: CustomEvent<MockEmployee[]>) => {
      if (isMockDataEnabled) setEmployees(event.detail);
    };
    const handlePayslipsUpdated = (event: CustomEvent<MockPayslip[]>) => {
      if (isMockDataEnabled) setPayslips(event.detail);
    };
    const handleLoansUpdated = (event: CustomEvent<Loan[]>) => {
      if (isMockDataEnabled) setLoans(event.detail);
    };
    const handleSavingPlansUpdated = (event: CustomEvent<SavingPlan[]>) => {
      if (isMockDataEnabled) setSavingPlans(event.detail);
    };
    const handleLeaveRecordsUpdated = (event: CustomEvent<LeaveEntry[]>) => {
      if (isMockDataEnabled) setLeaveRecords(event.detail);
    };
    const handleTimesheetsUpdated = (event: CustomEvent<TimesheetEntry[]>) => {
      if (isMockDataEnabled) setTimesheets(event.detail);
    };
    const handleToDosUpdated = (event: CustomEvent<ToDoEntry[]>) => {
      if (isMockDataEnabled) setToDos(event.detail);
    };

    window.addEventListener("employeesUpdated", handleEmployeesUpdated as EventListener);
    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
    window.addEventListener("loansUpdated", handleLoansUpdated as EventListener);
    window.addEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
    window.addEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
    window.addEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
    window.addEventListener("toDosUpdated", handleToDosUpdated as EventListener);

    return () => {
      window.removeEventListener("employeesUpdated", handleEmployeesUpdated as EventListener);
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
      window.removeEventListener("loansUpdated", handleLoansUpdated as EventListener);
      window.removeEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
      window.removeEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
      window.removeEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
      window.removeEventListener("toDosUpdated", handleToDosUpdated as EventListener);
    };
  }, [isMockDataEnabled]); // Dependencies for individual listeners

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
    setEmployees,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    toDos, // Expose toDos
    companyDetails, // Now derived
    isLoadingCompanyDetails, // Still expose loading state from useCompanyDetails
    isMockDataEnabled, // Expose isMockDataEnabled
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};