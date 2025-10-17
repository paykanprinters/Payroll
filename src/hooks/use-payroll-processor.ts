"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MockPayslip,
  Loan,
  SavingPlan,
  LeaveEntry,
  TimesheetEntry,
  MockCompanyDetails,
  ToDoEntry,
} from "@/lib/mock-data-interfaces";
import { useCompanyDetails } from "./use-company-details";
import { useEmployeesData } from "./use-employees-data"; // New import
import { useTaxTables } from "./use-tax-tables"; // New import
import { usePayrollProcessingLogic } from "./use-payroll-processing-logic"; // New import
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog"; // Import EmployeeFormValues

// Re-export TaxTables interface from use-tax-tables
export type { TaxTables } from "./use-tax-tables";

export const usePayrollProcessor = () => {
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(false);

  // Orchestrate other data hooks
  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails } = useCompanyDetails();
  const { taxTables, isLoadingTaxTables, refetchTaxTables } = useTaxTables(isMockDataEnabled);

  // Derived state for companyDetails: always reflects the correct source
  const companyDetails = useMemo(() => {
    if (isMockDataEnabled) {
      // For mock data, reconstruct company details from localStorage
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
      const mockCompanyWebsite = localStorage.getItem('companyWebsite') || "www.acmecorp.co.za";
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
    }
    return supabaseCompanyDetails;
  }, [isMockDataEnabled, supabaseCompanyDetails]);

  // Determine company name for employee ID generation
  const companyNameForEmployeeId = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Acme Corp";
  const { employees, isLoadingEmployees, addOrUpdateEmployee, deleteEmployee } = useEmployeesData(isMockDataEnabled, companyNameForEmployeeId); // Pass companyNameForEmployeeId

  // Local states for mock data that are not yet migrated to dedicated hooks
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [toDos, setToDos] = useState<ToDoEntry[]>([]); // State for To-Dos

  // Payroll processing logic
  const { runPayrollProcess, calculateSinglePayslipPreview } = usePayrollProcessingLogic(
    employees,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    taxTables,
    setPayslips,
    setLoans,
    setSavingPlans,
    setTimesheets,
  );

  // Effect for initial load and when mock data is toggled (full re-parse)
  useEffect(() => {
    const handleMockDataToggle = () => {
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);
      console.log("usePayrollProcessor: handleMockDataToggle triggered. mockEnabled:", mockEnabled);

      if (mockEnabled) {
        // Load all mock data from localStorage
        setPayslips(JSON.parse(localStorage.getItem("mockPayslips") || "[]"));
        setLoans(JSON.parse(localStorage.getItem("mockLoans") || "[]"));
        setSavingPlans(JSON.parse(localStorage.getItem("mockSavingPlans") || "[]"));
        setLeaveRecords(JSON.parse(localStorage.getItem("mockLeaveRecords") || "[]"));
        setTimesheets(JSON.parse(localStorage.getItem("mockTimesheets") || "[]"));
        setToDos(JSON.parse(localStorage.getItem("mockToDos") || "[]")); // Load To-Dos
        console.log("usePayrollProcessor: All mock data loaded from localStorage.");
      } else {
        // Clear all mock data states
        setPayslips([]);
        setLoans([]);
        setSavingPlans([]);
        setLeaveRecords([]);
        setTimesheets([]);
        setToDos([]); // Clear To-Dos
        console.log("usePayrollProcessor: All mock data states cleared.");
      }
    };

    // Initial load
    handleMockDataToggle();

    // Listen for general mock data update event
    window.addEventListener("allMockDataUpdated", handleMockDataToggle);
    return () => {
      window.removeEventListener("allMockDataUpdated", handleMockDataToggle);
    };
  }, []);

  // Individual listeners for specific data updates (only for mock data)
  useEffect(() => {
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
      if (isMockDataEnabled) setToDos(event.detail); // Update To-Dos state
    };

    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
    window.addEventListener("loansUpdated", handleLoansUpdated as EventListener);
    window.addEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
    window.addEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
    window.addEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
    window.addEventListener("toDosUpdated", handleToDosUpdated as EventListener);

    return () => {
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
      window.removeEventListener("loansUpdated", handleLoansUpdated as EventListener);
      window.removeEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
      window.removeEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
      window.removeEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
      window.removeEventListener("toDosUpdated", handleToDosUpdated as EventListener);
    };
  }, [isMockDataEnabled]);

  return {
    employees,
    addOrUpdateEmployee, // Expose addOrUpdateEmployee
    deleteEmployee,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    toDos, // Expose toDos
    companyDetails,
    isLoadingCompanyDetails,
    isMockDataEnabled,
    taxTables,
    isLoadingTaxTables,
    isLoadingEmployees,
    runPayrollProcess,
    calculateSinglePayslipPreview,
  };
};