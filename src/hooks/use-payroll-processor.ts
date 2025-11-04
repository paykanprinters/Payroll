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
import { useTaxTables } from "./use-tax-tables";
import { usePayrollProcessingLogic } from "./use-payroll-processing-logic";
import { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useLoansData } from "./use-loans-data";
import { useSavingPlansData } from "./use-saving-plans-data";
import usePayrollSavingsEntries from "./use-payroll-savings-entries";
import { useLeaveData } from "./use-leave-data";
import { useTimesheetData } from "./use-timesheet-data";
import { useToDosData } from "./use-todos-data";
import { usePayslipsData } from "./use-payslips-data";
import { useAuth } from "@/context/AuthContext";
import { useWorkHoursSettings } from "./use-work-hours-settings";
import { usePayCycleSettings } from "./use-pay-cycle-settings";
import { useUserTaxSettings } from "./use-user-tax-settings";
import { useEmployeesData } from "./use-employees-data";

// Re-export TaxTables interface from use-tax-tables
export type { TaxTables } from "./use-tax-tables";

export const usePayrollProcessor = (options?: { silent?: boolean }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const silent = options?.silent === true;

  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  // REMOVE localStorage persistence for active year; use live Supabase instead.
  const [activeTaxYearForCalculations, setActiveTaxYearState] = useState<number>(new Date().getFullYear());

  const mockLoansRef = useRef<string | null>(null);
  const mockSavingPlansRef = useRef<string | null>(null);
  const mockLeaveRecordsRef = useRef<string | null>(null);
  const mockTimesheetsRef = useRef<string | null>(null);
  const mockToDosRef = useRef<string | null>(null);
  const mockPayslipsRef = useRef<string | null>(null);
  // Removed: mockWorkHoursSettingsRef, mockPayCycleSettingsRef, mockUserTaxSettingsRef

  const [mockLoans, setMockLoans] = useState<Loan[]>([]);
  const [mockSavingPlans, setMockSavingPlans] = useState<SavingPlan[]>([]);
  const [mockLeaveRecords, setMockLeaveRecords] = useState<LeaveEntry[]>([]);
  const [mockTimesheets, setMockTimesheets] = useState<TimesheetEntry[]>([]);
  const [mockToDos, setMockToDos] = useState<ToDoEntry[]>([]);
  const [mockPayslips, setMockPayslips] = useState<MockPayslip[]>([]);
  // Removed: mockWorkHoursSettings, mockPayCycleSettings, mockUserTaxSettings

  const hasTriggeredGenerateToDosRef = useRef(false);
  const isGeneratingToDosRef = useRef(false);
  // ADDED: Ref to hold refetchToDos once initialized
  const refetchToDosFnRef = useRef<(() => void) | null>(null);

  const triggerGenerateToDos = useCallback(async () => {
    console.log("usePayrollProcessor: triggerGenerateToDos called.");
    if (isMockDataEnabled) {
      console.log("usePayrollProcessor: Mock data is enabled, skipping Edge Function call for To-Dos.");
      return;
    }
    if (!isAuthenticated) {
      console.warn("usePayrollProcessor: Not authenticated, skipping generate-todos Edge Function call.");
      return;
    }

    try {
      console.log("usePayrollProcessor: Attempting to invoke 'generate-todos' Edge Function...");
      const { data, error } = await supabase.functions.invoke('generate-todos');

      if (error) {
        console.error('usePayrollProcessor: Error invoking generate-todos Edge Function:', error);
        showError(`Failed to generate To-Dos: ${error.message}`);
      } else {
        console.log('usePayrollProcessor: Generate To-Dos Edge Function response:', data);
        // UPDATED: Use ref to avoid TDZ; only call if initialized
        refetchToDosFnRef.current?.();
        showSuccess("To-Dos refreshed successfully!");
      }
    } catch (error: any) {
      console.error('usePayrollProcessor: Unhandled error triggering generate-todos Edge Function:', error);
      showError(`An unexpected error occurred while generating To-Dos: ${error.message}`);
    }
  // UPDATED: Remove refetchToDos from deps to avoid TDZ
  }, [isMockDataEnabled, isAuthenticated]);

  // Guarded wrapper defined AFTER triggerGenerateToDos
  const safeTriggerGenerateToDos = useCallback(async () => {
    if (isGeneratingToDosRef.current) {
      console.log("usePayrollProcessor: safeTriggerGenerateToDos - already in progress, skipping.");
      return;
    }
    isGeneratingToDosRef.current = true;
    try {
      await triggerGenerateToDos();
      hasTriggeredGenerateToDosRef.current = true;
    } finally {
      isGeneratingToDosRef.current = false;
    }
  }, [triggerGenerateToDos]);

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

      const currentPayslips = localStorage.getItem("mockPayslips");
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
      setMockPayslips([]);

      mockLoansRef.current = null;
      mockSavingPlansRef.current = null;
      mockLeaveRecordsRef.current = null;
      mockTimesheetsRef.current = null;
      mockToDosRef.current = null;
      mockPayslipsRef.current = null;
    }
  }, [isMockDataEnabled]);

  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails, upsertCompanyDetails } = useCompanyDetails({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  // Pass activeTaxYearForCalculations to useTaxTables
  const { taxTables, isLoadingTaxTables, refetchTaxTables } = useTaxTables({ isMockDataEnabled, isAuthenticated, isLoadingAuth, activeTaxYear: activeTaxYearForCalculations });
  const { workHoursSettings, isLoadingWorkHoursSettings, saveWorkHoursSettings, refetchWorkHoursSettings } = useWorkHoursSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { payCycleSettings, isLoadingPayCycleSettings, savePayCycleSettings, refetchPayCycleSettings } = usePayCycleSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { userTaxSettings, isLoadingUserTaxSettings, saveUserTaxSettings, refetchUserTaxSettings } = useUserTaxSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  // Directly use supabaseCompanyDetails, which is now more stable due to deep comparison in useCompanyDetails
  const companyDetails = supabaseCompanyDetails;

  // Sync active tax year from live company details when available
  useEffect(() => {
    const liveYear = companyDetails?.activeTaxYear;
    if (typeof liveYear === "number" && liveYear > 0 && liveYear !== activeTaxYearForCalculations) {
      setActiveTaxYearState(liveYear);
    }
  }, [companyDetails, activeTaxYearForCalculations]);

  // Expose a setter that persists to Supabase (live-first)
  const setActiveTaxYearForCalculations = useCallback((year: number) => {
    setActiveTaxYearState(year);
    // Persist to Supabase when not in mock-only mode
    if (!isMockDataEnabled) {
      upsertCompanyDetails({ activeTaxYear: year });
    }
  }, [isMockDataEnabled, upsertCompanyDetails]);

  const companyNameForEmployeeId = useMemo(() => {
    return companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Acme Corp";
  }, [companyDetails]);

  const { employees, isLoadingEmployees, isMutatingEmployee, addOrUpdateEmployee: baseAddOrUpdateEmployee, deleteEmployee: baseDeleteEmployee } = useEmployeesData({ isMockDataEnabled, companyName: companyNameForEmployeeId, isAuthenticated, isLoadingAuth });

  const { payslips, setPayslips, isLoadingPayslips, upsertPayslip, batchUpsertPayslips, refetchPayslips } = usePayslipsData({ initialPayslips: mockPayslips, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { loans, isLoadingLoans, addLoan, updateLoan, deleteLoan, togglePauseDeduction, applyManualPayment } = useLoansData({ initialLoans: mockLoans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { savingPlans, isLoadingSavingPlans, addSavingPlan, updateSavingPlan } = useSavingPlansData({ initialSavingPlans: mockSavingPlans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { payrollSavingsEntries, isLoadingPayrollSavingsEntries, recordSavingsPayment, refetchPayrollSavingsEntries } = usePayrollSavingsEntries({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { leaveRecords, isLoadingLeaveRecords, addLeaveRecord } = useLeaveData({ initialLeaveRecords: mockLeaveRecords, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { timesheets, isLoadingTimesheets, addOrUpdateTimesheet, deleteTimesheet, updateTimesheetStatus, addTimesheetBatch } = useTimesheetData({ initialTimesheets: mockTimesheets, employees, leaveRecords, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { toDos, pendingCount, isLoadingToDos, markToDoAsDone, refetchToDos } = useToDosData({ initialToDos: mockToDos, isMockDataEnabled, employees, addOrUpdateEmployee: baseAddOrUpdateEmployee, isAuthenticated, isLoadingAuth });

  // ADDED: Assign the refetch function to the ref once available
  refetchToDosFnRef.current = refetchToDos;

  // Add this console log to check the type of batchUpsertPayslips
  console.log("usePayrollProcessor: Type of batchUpsertPayslips from usePayslipsData:", typeof batchUpsertPayslips);

  const { runPayrollProcess, calculateSinglePayslipPreview } = usePayrollProcessingLogic(
    employees,
    payslips,
    loans,
    savingPlans,
    leaveRecords,
    timesheets,
    taxTables,
    userTaxSettings,
    payrollSavingsEntries,
    setPayslips,
    updateLoan,
    updateSavingPlan,
    updateTimesheetStatus,
    batchUpsertPayslips,
    recordSavingsPayment,
    isMockDataEnabled,
  );

  useEffect(() => {
    if (silent) return;

    const handleMockDataToggleEvent = () => {
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);
      console.log("usePayrollProcessor: 'allMockDataUpdated' event received. Setting isMockDataEnabled to:", mockEnabled);
      if (!mockEnabled && isAuthenticated && !isLoadingAuth) {
        console.log("usePayrollProcessor: Live mode after mock toggle; attempting safe To-Dos generation.");
        safeTriggerGenerateToDos();
      }
    };

    window.addEventListener("allMockDataUpdated", handleMockDataToggleEvent);

    // Call generate-todos once on initial load if conditions are met and it hasn't run yet
    if (!isMockDataEnabled && isAuthenticated && !isLoadingAuth && !hasTriggeredGenerateToDosRef.current) {
      console.log("usePayrollProcessor: Initial load; attempting safe To-Dos generation.");
      safeTriggerGenerateToDos();
    }

    return () => {
      window.removeEventListener("allMockDataUpdated", handleMockDataToggleEvent);
    };
  }, [isAuthenticated, isLoadingAuth, isMockDataEnabled, safeTriggerGenerateToDos, silent]);

  useEffect(() => {
    if (silent) return;

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
    const handlePayslipsUpdated = (event: CustomEvent<MockPayslip[]>) => {
      if (isMockDataEnabled) setMockPayslips(event.detail);
    };

    window.addEventListener("loansUpdated", handleLoansUpdated as EventListener);
    window.addEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
    window.addEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
    window.addEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
    window.addEventListener("toDosUpdated", handleToDosUpdated as EventListener);
    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);

    return () => {
      window.removeEventListener("loansUpdated", handleLoansUpdated as EventListener);
      window.removeEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
      window.removeEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
      window.removeEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
      window.removeEventListener("toDosUpdated", handleToDosUpdated as EventListener);
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
    };
  }, [isMockDataEnabled, silent]);


  return {
    employees,
    addOrUpdateEmployee: baseAddOrUpdateEmployee,
    deleteEmployee: baseDeleteEmployee,
    payslips,
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
    workHoursSettings, // Directly expose from hook
    isLoadingWorkHoursSettings,
    payCycleSettings, // Directly expose from hook
    isLoadingPayCycleSettings,
    userTaxSettings, // Directly expose from hook
    isLoadingUserTaxSettings,
    isLoadingEmployees,
    isMutatingEmployee,
    isLoadingLoans,
    isLoadingSavingPlans,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
    isLoadingToDos,
    isLoadingPayslips,
    isLoadingPayrollSavingsEntries,
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
    refetchPayslips,
    refetchPayrollSavingsEntries,
    activeTaxYearForCalculations,
    setActiveTaxYearForCalculations,
  };
};