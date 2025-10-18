"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { useLoansData } from "./use-loans-data";
import { useSavingPlansData } from "./use-saving-plans-data";
import { useLeaveData } from "./use-leave-data";
import { useTimesheetData } from "./use-timesheet-data";
import { useToDosData } from "./use-todos-data";
import { usePayslipsData } from "./use-payslips-data"; // New import
import { useAuth } from "@/context/AuthContext";

// Re-export TaxTables interface from use-tax-tables
export type { TaxTables } from "./use-tax-tables";

export const usePayrollProcessor = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  const mockLoansRef = useRef<string | null>(null);
  const mockSavingPlansRef = useRef<string | null>(null);
  const mockLeaveRecordsRef = useRef<string | null>(null);
  const mockTimesheetsRef = useRef<string | null>(null);
  const mockToDosRef = useRef<string | null>(null);
  const mockPayslipsRef = useRef<string | null>(null); // New ref for mock payslips

  const [mockLoans, setMockLoans] = useState<Loan[]>([]);
  const [mockSavingPlans, setMockSavingPlans] = useState<SavingPlan[]>([]);
  const [mockLeaveRecords, setMockLeaveRecords] = useState<LeaveEntry[]>([]);
  const [mockTimesheets, setMockTimesheets] = useState<TimesheetEntry[]>([]);
  const [mockToDos, setMockToDos] = useState<ToDoEntry[]>([]);
  const [mockPayslips, setMockPayslips] = useState<MockPayslip[]>([]); // New state for mock payslips

  useEffect(() => {
    if (isMockDataEnabled) {
      const currentLoans = localStorage.getItem("mockLoans");
      if (currentLoans !== mockLoansRef.current) {
        setMockLoans(JSON.parse(currentLoans || "[]"));
        mockLoansRef.current = currentLoans;
      }

      const currentSavingPlans = localStorage.getItem("mockSavingPlans");
      if (currentSavingPlans !== mockSavingPlansRef.current) {
        setMockSavingPlans(JSON.parse(currentSavingPlans || "[]"));
        mockSavingPlansRef.current = currentSavingPlans;
      }

      const currentLeaveRecords = localStorage.getItem("mockLeaveRecords");
      if (currentLeaveRecords !== mockLeaveRecordsRef.current) {
        setMockLeaveRecords(JSON.parse(currentLeaveRecords || "[]"));
        mockLeaveRecordsRef.current = currentLeaveRecords;
      }

      const currentTimesheets = localStorage.getItem("mockTimesheets");
      if (currentTimesheets !== mockTimesheetsRef.current) {
        setMockTimesheets(JSON.parse(currentTimesheets || "[]"));
        mockTimesheetsRef.current = currentTimesheets;
      }

      const currentToDos = localStorage.getItem("mockToDos");
      if (currentToDos !== mockToDosRef.current) {
        setMockToDos(JSON.parse(currentToDos || "[]"));
        mockToDosRef.current = currentToDos;
      }

      const currentPayslips = localStorage.getItem("mockPayslips"); // Load mock payslips
      if (currentPayslips !== mockPayslipsRef.current) {
        setMockPayslips(JSON.parse(currentPayslips || "[]"));
        mockPayslipsRef.current = currentPayslips;
      }
    } else {
      setMockLoans([]);
      setMockSavingPlans([]);
      setMockLeaveRecords([]);
      setMockTimesheets([]);
      setMockToDos([]);
      setMockPayslips([]); // Clear mock payslips

      mockLoansRef.current = null;
      mockSavingPlansRef.current = null;
      mockLeaveRecordsRef.current = null;
      mockTimesheetsRef.current = null;
      mockToDosRef.current = null;
      mockPayslipsRef.current = null; // Clear ref
    }
  }, [isMockDataEnabled]);

  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails } = useCompanyDetails({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { taxTables, isLoadingTaxTables, refetchTaxTables } = useTaxTables({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const companyDetails = useMemo(() => {
    if (isMockDataEnabled) {
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

  const companyNameForEmployeeId = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Acme Corp";
  const { employees, isLoadingEmployees, addOrUpdateEmployee, deleteEmployee } = useEmployeesData({ isMockDataEnabled, companyName: companyNameForEmployeeId, isAuthenticated, isLoadingAuth });

  const { payslips, setPayslips, isLoadingPayslips, upsertPayslip, batchUpsertPayslips, refetchPayslips } = usePayslipsData({ initialPayslips: mockPayslips, isMockDataEnabled, isAuthenticated, isLoadingAuth }); // Use new hook
  const { loans, isLoadingLoans, addLoan, updateLoan, deleteLoan, togglePauseDeduction, applyManualPayment } = useLoansData({ initialLoans: mockLoans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { savingPlans, isLoadingSavingPlans, addSavingPlan, updateSavingPlan } = useSavingPlansData({ initialSavingPlans: mockSavingPlans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { leaveRecords, isLoadingLeaveRecords, addLeaveRecord } = useLeaveData({ initialLeaveRecords: mockLeaveRecords, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { timesheets, isLoadingTimesheets, addOrUpdateTimesheet, deleteTimesheet, updateTimesheetStatus, addTimesheetBatch } = useTimesheetData({ initialTimesheets: mockTimesheets, employees, leaveRecords, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { toDos, pendingCount, isLoadingToDos, markToDoAsDone, refetchToDos } = useToDosData({ initialToDos: mockToDos, isMockDataEnabled, employees, addOrUpdateEmployee, isAuthenticated, isLoadingAuth });

  const { runPayrollProcess, calculateSinglePayslipPreview } = usePayrollProcessingLogic(
    employees,
    payslips, // Pass payslips from usePayslipsData
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    taxTables,
    setPayslips, // Pass setPayslips from usePayslipsData
    updateLoan,
    updateSavingPlan,
    updateTimesheetStatus,
    batchUpsertPayslips, // Pass batchUpsertPayslips
    isMockDataEnabled, // Pass isMockDataEnabled
  );

  const triggerGenerateToDos = useCallback(async () => {
    if (isMockDataEnabled) return;
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
        refetchToDos();
        showSuccess("To-Dos refreshed successfully!");
      }
    } catch (error: any) {
      console.error('usePayrollProcessor: Unhandled error triggering generate-todos Edge Function:', error);
      showError(`An unexpected error occurred while generating To-Dos: ${error.message}`);
    }
  }, [isMockDataEnabled, isAuthenticated, refetchToDos]);

  useEffect(() => {
    const handleMockDataToggleEvent = () => {
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);
      console.log("usePayrollProcessor: 'allMockDataUpdated' event received. Setting isMockDataEnabled to:", mockEnabled);
      if (!mockEnabled && isAuthenticated && !isLoadingAuth) {
        triggerGenerateToDos();
      }
    };

    window.addEventListener("allMockDataUpdated", handleMockDataToggleEvent);
    return () => {
      window.removeEventListener("allMockDataUpdated", handleMockDataToggleEvent);
    };
  }, [isAuthenticated, isLoadingAuth, triggerGenerateToDos]);

  useEffect(() => {
    const handleLoansUpdated = (event: CustomEvent<Loan[]>) => {
      if (isMockDataEnabled) setMockLoans(event.detail);
    };
    const handleSavingPlansUpdated = (event: CustomEvent<SavingPlan[]>) => {
      if (isMockDataEnabled) setMockSavingPlans(event.detail);
    };
    const handleLeaveRecordsUpdated = (event: CustomEvent<LeaveEntry[]>) => {
      if (isMockDataEnabled) setMockLeaveRecords(event.detail);
    };
    const handleTimesheetsUpdated = (event: CustomEvent<TimesheetEntry[]>) => {
      if (isMockDataEnabled) setMockTimesheets(event.detail);
    };
    const handleToDosUpdated = (event: CustomEvent<ToDoEntry[]>) => {
      if (isMockDataEnabled) setMockToDos(event.detail);
    };
    const handlePayslipsUpdated = (event: CustomEvent<MockPayslip[]>) => { // New handler for payslips
      if (isMockDataEnabled) setMockPayslips(event.detail);
    };


    window.addEventListener("loansUpdated", handleLoansUpdated as EventListener);
    window.addEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
    window.addEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
    window.addEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
    window.addEventListener("toDosUpdated", handleToDosUpdated as EventListener);
    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener); // New listener


    return () => {
      window.removeEventListener("loansUpdated", handleLoansUpdated as EventListener);
      window.removeEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
      window.removeEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
      window.removeEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
      window.removeEventListener("toDosUpdated", handleToDosUpdated as EventListener);
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener); // New cleanup
    };
  }, [isMockDataEnabled]);


  return {
    employees,
    addOrUpdateEmployee,
    deleteEmployee,
    payslips, // Now from usePayslipsData
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    toDos,
    pendingCount,
    companyDetails,
    isLoadingCompanyDetails,
    isMockDataEnabled,
    taxTables,
    isLoadingTaxTables,
    isLoadingEmployees,
    isLoadingLoans,
    isLoadingSavingPlans,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
    isLoadingToDos,
    isLoadingPayslips, // Expose isLoadingPayslips
    runPayrollProcess,
    calculateSinglePayslipPreview,
    triggerGenerateToDos,
    addLoan,
    updateLoan,
    deleteLoan,
    togglePauseDeduction,
    applyManualPayment,
    addSavingPlan,
    updateSavingPlan,
    addLeaveRecord,
    addOrUpdateTimesheet,
    deleteTimesheet,
    updateTimesheetStatus,
    addTimesheetBatch,
    markToDoAsDone,
    isAuthenticated,
    isLoadingAuth,
    refetchPayslips, // Expose refetchPayslips
  };
};