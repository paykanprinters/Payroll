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
import { useEmployeesData } from "./use-employees-data";
import { useTaxTables } from "./use-tax-tables";
import { usePayrollProcessingLogic } from "./use-payroll-processing-logic";
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useLoansData } from "./use-loans-data"; // Import useLoansData
import { useSavingPlansData } from "./use-saving-plans-data"; // Import useSavingPlansData
import { useLeaveData } from "./use-leave-data"; // Import useLeaveData
import { useTimesheetData } from "./use-timesheet-data"; // Import useTimesheetData
import { useToDosData } from "./use-todos-data"; // Import useToDosData
import { useAuth } from "@/context/AuthContext"; // Import useAuth

// Re-export TaxTables interface from use-tax-tables
export type { TaxTables } from "./use-tax-tables";

export const usePayrollProcessor = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth(); // Get auth state

  // Initialize isMockDataEnabled directly from localStorage to prevent re-render loops
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  // Orchestrate other data hooks
  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails } = useCompanyDetails({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { taxTables, isLoadingTaxTables, refetchTaxTables } = useTaxTables({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

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
  const { employees, isLoadingEmployees, addOrUpdateEmployee, deleteEmployee } = useEmployeesData({ isMockDataEnabled, companyName: companyNameForEmployeeId, isAuthenticated, isLoadingAuth });

  // Local states for mock data that are not yet migrated to dedicated hooks
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);

  // Use dedicated hooks for other data types
  const { loans, isLoadingLoans, addLoan, updateLoan, deleteLoan, togglePauseDeduction, applyManualPayment } = useLoansData({ initialLoans: [], employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { savingPlans, isLoadingSavingPlans, addSavingPlan, updateSavingPlan } = useSavingPlansData({ initialSavingPlans: [], employees, isMockDataEnabled, isAuthenticated, isLoadingAuth }); // Get updateSavingPlan
  const { leaveRecords, isLoadingLeaveRecords, addLeaveRecord } = useLeaveData({ initialLeaveRecords: [], employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { timesheets, isLoadingTimesheets, addOrUpdateTimesheet, deleteTimesheet, updateTimesheetStatus, addTimesheetBatch } = useTimesheetData({ initialTimesheets: [], employees, leaveRecords, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { toDos, isLoadingToDos, markToDoAsDone, refetchToDos } = useToDosData({ initialToDos: [], isMockDataEnabled, employees, addOrUpdateEmployee, isAuthenticated, isLoadingAuth }); // Pass addOrUpdateEmployee

  // Payroll processing logic
  const { runPayrollProcess, calculateSinglePayslipPreview } = usePayrollProcessingLogic(
    employees,
    payslips, // Pass local payslips state
    loans, // Pass current loans state
    savingPlans, // Pass current savingPlans state
    leaveRecords, // Pass current leaveRecords state
    timesheets, // Pass current timesheets state
    taxTables,
    setPayslips, // Pass local setPayslips
    updateLoan, // Pass updateLoan from useLoansData
    updateSavingPlan, // Pass updateSavingPlan from useSavingPlansData
    updateTimesheetStatus, // Pass updateTimesheetStatus from useTimesheetData
  );

  // Function to trigger the generate-todos Edge Function
  const triggerGenerateToDos = useCallback(async () => {
    if (isMockDataEnabled) return; // Only for live data
    if (!isAuthenticated) {
      console.warn("Not authenticated, skipping generate-todos Edge Function call.");
      return;
    }

    try {
      console.log("usePayrollProcessor: Triggering generate-todos Edge Function...");
      const { data, error } = await supabase.functions.invoke('generate-todos');

      if (error) {
        console.error('Error invoking generate-todos Edge Function:', error);
        showError(`Failed to generate To-Dos: ${error.message}`);
      } else {
        console.log('Generate To-Dos Edge Function response:', data);
        refetchToDos(); // Re-fetch To-Dos after generation
        showSuccess("To-Dos refreshed successfully!");
      }
    } catch (error: any) {
      console.error('usePayrollProcessor: Unhandled error triggering generate-todos Edge Function:', error);
      showError(`An unexpected error occurred while generating To-Dos: ${error.message}`);
    }
  }, [isMockDataEnabled, isAuthenticated, refetchToDos]);


  // Effect to handle changes in isMockDataEnabled and update local payslips state
  useEffect(() => {
    // This effect runs when isMockDataEnabled changes (e.g., from MockData.tsx toggle)
    // or on initial mount after isMockDataEnabled is set from localStorage.
    if (isMockDataEnabled) {
      setPayslips(JSON.parse(localStorage.getItem("mockPayslips") || "[]"));
    } else {
      setPayslips([]); // Clear mock payslips when switching to live
      // Only trigger if authenticated and not loading auth
      if (isAuthenticated && !isLoadingAuth) {
        triggerGenerateToDos(); // Trigger To-Do generation when switching to live data
      }
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, triggerGenerateToDos]);

  // Listen for general mock data update event (for other components to react)
  useEffect(() => {
    const handleMockDataToggleEvent = () => {
      // When this event fires, it means MockData.tsx has updated localStorage.
      // We need to update our internal isMockDataEnabled state to reflect this.
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);
      console.log("usePayrollProcessor: 'allMockDataUpdated' event received. Setting isMockDataEnabled to:", mockEnabled);
      // The subsequent useEffect will handle updating payslips and triggering todos based on this new state.
    };

    window.addEventListener("allMockDataUpdated", handleMockDataToggleEvent);
    return () => {
      window.removeEventListener("allMockDataUpdated", handleMockDataToggleEvent);
    };
  }, []);


  // Individual listeners for specific data updates (only for mock data)
  useEffect(() => {
    const handlePayslipsUpdated = (event: CustomEvent<MockPayslip[]>) => {
      if (isMockDataEnabled) setPayslips(event.detail);
    };

    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);

    return () => {
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
    };
  }, [isMockDataEnabled]);

  return {
    employees,
    addOrUpdateEmployee,
    deleteEmployee,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    toDos,
    companyDetails,
    isLoadingCompanyDetails,
    isMockDataEnabled,
    taxTables,
    isLoadingTaxTables,
    isLoadingEmployees,
    isLoadingLoans, // Expose loading state
    isLoadingSavingPlans, // Expose loading state
    isLoadingLeaveRecords, // Expose loading state
    isLoadingTimesheets, // Expose loading state
    isLoadingToDos, // Expose loading state
    runPayrollProcess,
    calculateSinglePayslipPreview,
    triggerGenerateToDos,
    addLoan, // Expose from useLoansData
    updateLoan, // Expose from useLoansData
    deleteLoan, // Expose from useLoansData
    togglePauseDeduction, // Expose from useLoansData
    applyManualPayment, // Expose from useLoansData
    addSavingPlan, // Expose from useSavingPlansData
    updateSavingPlan, // Expose from useSavingPlansData
    addLeaveRecord, // Expose from useLeaveData
    addOrUpdateTimesheet, // Expose from useTimesheetData
    deleteTimesheet, // Expose from useTimesheetData
    updateTimesheetStatus, // Expose from useTimesheetData
    addTimesheetBatch, // Expose from useTimesheetData
    markToDoAsDone, // Expose from useToDosData
  };
};