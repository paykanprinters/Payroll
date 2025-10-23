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
import { useLeaveData } from "./use-leave-data";
import { useTimesheetData } from "./use-timesheet-data";
import { useToDosData } from "./use-todos-data";
import { usePayslipsData } from "./use-payslips-data";
import { useAuth } from "@/context/AuthContext";
import { useWorkHoursSettings } from "./use-work-hours-settings";
import { usePayCycleSettings } from "./use-pay-cycle-settings";
import { useUserTaxSettings } from "./use-user-tax-settings"; // New import

// Re-export TaxTables interface from use-tax-tables
export type { TaxTables } from "./use-tax-tables";

export const usePayrollProcessor = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  // NEW: State to hold the active tax year for calculations
  const [activeTaxYearForCalculations, setActiveTaxYearForCalculations] = useState<number>(() => {
    // Initialize from localStorage if available, otherwise current year
    const savedYear = localStorage.getItem("activeTaxYearForCalculations");
    return savedYear ? parseInt(savedYear) : new Date().getFullYear();
  });

  // Persist activeTaxYearForCalculations to localStorage
  useEffect(() => {
    localStorage.setItem("activeTaxYearForCalculations", activeTaxYearForCalculations.toString());
  }, [activeTaxYearForCalculations]);


  const mockLoansRef = useRef<string | null>(null);
  const mockSavingPlansRef = useRef<string | null>(null);
  const mockLeaveRecordsRef = useRef<string | null>(null);
  const mockTimesheetsRef = useRef<string | null>(null);
  const mockToDosRef = useRef<string | null>(null);
  const mockPayslipsRef = useRef<string | null>(null);
  const mockWorkHoursSettingsRef = useRef<string | null>(null);
  const mockPayCycleSettingsRef = useRef<string | null>(null);
  const mockUserTaxSettingsRef = useRef<string | null>(null); // New ref for mock user tax settings

  const [mockLoans, setMockLoans] = useState<Loan[]>([]);
  const [mockSavingPlans, setMockSavingPlans] = useState<SavingPlan[]>([]);
  const [mockLeaveRecords, setMockLeaveRecords] = useState<LeaveEntry[]>([]);
  const [mockTimesheets, setMockTimesheets] = useState<TimesheetEntry[]>([]);
  const [mockToDos, setMockToDos] = useState<ToDoEntry[]>([]);
  const [mockPayslips, setMockPayslips] = useState<MockPayslip[]>([]);
  const [mockWorkHoursSettings, setMockWorkHoursSettings] = useState<any>(null);
  const [mockPayCycleSettings, setMockPayCycleSettings] = useState<any>(null);
  const [mockUserTaxSettings, setMockUserTaxSettings] = useState<any>(null); // New state for mock user tax settings

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

      const currentWorkHoursSettings = localStorage.getItem("workHoursSettings");
      if (currentWorkHoursSettings !== mockWorkHoursSettingsRef.current) {
        setMockWorkHoursSettings(JSON.parse(currentWorkHoursSettings || "null"));
        mockWorkHoursSettingsRef.current = currentWorkHoursSettings;
      }

      const currentPayCycleSettings = localStorage.getItem("payCycleSettings");
      if (currentPayCycleSettings !== mockPayCycleSettingsRef.current) {
        setMockPayCycleSettings(JSON.parse(currentPayCycleSettings || "null"));
        mockPayCycleSettingsRef.current = currentPayCycleSettings;
      }

      const currentUserTaxSettings = localStorage.getItem("userTaxSettings"); // Load mock user tax settings
      if (currentUserTaxSettings !== mockUserTaxSettingsRef.current) {
        setMockUserTaxSettings(JSON.parse(currentUserTaxSettings || "null"));
        mockUserTaxSettingsRef.current = currentUserTaxSettings;
      }
    } else {
      setMockLoans([]);
      setMockSavingPlans([]);
      setMockLeaveRecords([]);
      setMockTimesheets([]);
      setMockToDos([]);
      setMockPayslips([]);
      setMockWorkHoursSettings(null);
      setMockPayCycleSettings(null);
      setMockUserTaxSettings(null); // Clear mock user tax settings

      mockLoansRef.current = null;
      mockSavingPlansRef.current = null;
      mockLeaveRecordsRef.current = null;
      mockTimesheetsRef.current = null;
      mockToDosRef.current = null;
      mockPayslipsRef.current = null;
      mockWorkHoursSettingsRef.current = null;
      mockPayCycleSettingsRef.current = null;
      mockUserTaxSettingsRef.current = null; // Clear ref
    }
  }, [isMockDataEnabled]);

  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails } = useCompanyDetails({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  // Pass activeTaxYearForCalculations to useTaxTables
  const { taxTables, isLoadingTaxTables, refetchTaxTables } = useTaxTables({ isMockDataEnabled, isAuthenticated, isLoadingAuth, activeTaxYear: activeTaxYearForCalculations });
  const { workHoursSettings, isLoadingWorkHoursSettings, saveWorkHoursSettings, refetchWorkHoursSettings } = useWorkHoursSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { payCycleSettings, isLoadingPayCycleSettings, savePayCycleSettings, refetchPayCycleSettings } = usePayCycleSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { userTaxSettings, isLoadingUserTaxSettings, saveUserTaxSettings, refetchUserTaxSettings } = useUserTaxSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth }); // New hook

  // Directly use supabaseCompanyDetails, which is now more stable due to deep comparison in useCompanyDetails
  const companyDetails = supabaseCompanyDetails;

  const companyNameForEmployeeId = useMemo(() => {
    return companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Acme Corp";
  }, [companyDetails]);

  const { employees, isLoadingEmployees, isMutatingEmployee, addOrUpdateEmployee: baseAddOrUpdateEmployee, deleteEmployee: baseDeleteEmployee } = useEmployeesData({ isMockDataEnabled, companyName: companyNameForEmployeeId, isAuthenticated, isLoadingAuth });

  const { payslips, setPayslips, isLoadingPayslips, upsertPayslip, batchUpsertPayslips, refetchPayslips } = usePayslipsData({ initialPayslips: mockPayslips, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { loans, isLoadingLoans, addLoan, updateLoan, deleteLoan, togglePauseDeduction, applyManualPayment } = useLoansData({ initialLoans: mockLoans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { savingPlans, isLoadingSavingPlans, addSavingPlan, updateSavingPlan } = useSavingPlansData({ initialSavingPlans: mockSavingPlans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { leaveRecords, isLoadingLeaveRecords, addLeaveRecord } = useLeaveData({ initialLeaveRecords: mockLeaveRecords, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { timesheets, isLoadingTimesheets, addOrUpdateTimesheet, deleteTimesheet, updateTimesheetStatus, addTimesheetBatch } = useTimesheetData({ initialTimesheets: mockTimesheets, employees, leaveRecords, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const { toDos, pendingCount, isLoadingToDos, markToDoAsDone, refetchToDos } = useToDosData({ initialToDos: mockToDos, isMockDataEnabled, employees, addOrUpdateEmployee: baseAddOrUpdateEmployee, isAuthenticated, isLoadingAuth });

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
    userTaxSettings, // New parameter for user tax settings
    setPayslips,
    updateLoan,
    updateSavingPlan,
    updateTimesheetStatus,
    batchUpsertPayslips, // This is the argument being passed
    isMockDataEnabled,
  );

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
        refetchToDos();
        showSuccess("To-Dos refreshed successfully!");
      }
    } catch (error: any) {
      console.error('usePayrollProcessor: Unhandled error triggering generate-todos Edge Function:', error);
      showError(`An unexpected error occurred while generating To-Dos: ${error.message}`);
    }
  }, [isMockDataEnabled, isAuthenticated, refetchToDos]);

  // Wrap addOrUpdateEmployee and deleteEmployee to trigger To-Do generation
  const addOrUpdateEmployee = useCallback(async (employeeData: EmployeeFormValues) => {
    console.log("usePayrollProcessor: addOrUpdateEmployee called. Triggering baseAddOrUpdateEmployee.");
    await baseAddOrUpdateEmployee(employeeData);
    if (!isMockDataEnabled) {
      console.log("usePayrollProcessor: Live data mode, calling triggerGenerateToDos after employee update.");
      triggerGenerateToDos();
    }
  }, [baseAddOrUpdateEmployee, isMockDataEnabled, triggerGenerateToDos]);

  const deleteEmployee = useCallback(async (employeeId: string, employeeName: string) => {
    console.log("usePayrollProcessor: deleteEmployee called. Triggering baseDeleteEmployee.");
    await baseDeleteEmployee(employeeId, employeeName);
    if (!isMockDataEnabled) {
      console.log("usePayrollProcessor: Live data mode, calling triggerGenerateToDos after employee deletion.");
      triggerGenerateToDos();
    }
  }, [baseDeleteEmployee, isMockDataEnabled, triggerGenerateToDos]);


  useEffect(() => {
    const handleMockDataToggleEvent = () => {
      const mockEnabled = localStorage.getItem("isMockDataEnabled") === "true";
      setIsMockDataEnabled(mockEnabled);
      console.log("usePayrollProcessor: 'allMockDataUpdated' event received. Setting isMockDataEnabled to:", mockEnabled);
      if (!mockEnabled && isAuthenticated && !isLoadingAuth) {
        console.log("usePayrollProcessor: Mock data disabled, authenticated, and auth loaded. Triggering To-Dos generation.");
        triggerGenerateToDos();
      }
    };

    window.addEventListener("allMockDataUpdated", handleMockDataToggleEvent);

    // NEW: Call triggerGenerateToDos on initial load if conditions are met
    if (!isMockDataEnabled && isAuthenticated && !isLoadingAuth) {
      console.log("usePayrollProcessor: Initial load - Mock data disabled, authenticated, and auth loaded. Triggering To-Dos generation.");
      triggerGenerateToDos();
    }

    return () => {
      window.removeEventListener("allMockDataUpdated", handleMockDataToggleEvent);
    };
  }, [isAuthenticated, isLoadingAuth, triggerGenerateToDos, isMockDataEnabled]);

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
    const handlePayslipsUpdated = (event: CustomEvent<MockPayslip[]>) => {
      if (isMockDataEnabled) setMockPayslips(event.detail);
    };
    const handleWorkHoursSettingsUpdated = () => {
      if (isMockDataEnabled) {
        const currentWorkHoursSettings = localStorage.getItem("workHoursSettings");
        setMockWorkHoursSettings(JSON.parse(currentWorkHoursSettings || "null"));
      } else {
        refetchWorkHoursSettings();
      }
    };
    const handlePayCycleSettingsUpdated = () => {
      if (isMockDataEnabled) {
        const currentPayCycleSettings = localStorage.getItem("payCycleSettings");
        setMockPayCycleSettings(JSON.parse(currentPayCycleSettings || "null"));
      } else {
        refetchPayCycleSettings();
      }
    };
    const handleUserTaxSettingsUpdated = () => { // New handler for user tax settings
      if (isMockDataEnabled) {
        const currentUserTaxSettings = localStorage.getItem("userTaxSettings");
        setMockUserTaxSettings(JSON.parse(currentUserTaxSettings || "null"));
      } else {
        refetchUserTaxSettings(); // Refetch live settings
      }
    };


    window.addEventListener("loansUpdated", handleLoansUpdated as EventListener);
    window.addEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
    window.addEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
    window.addEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
    window.addEventListener("toDosUpdated", handleToDosUpdated as EventListener);
    window.addEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
    window.addEventListener("workHoursSettingsUpdated", handleWorkHoursSettingsUpdated);
    window.addEventListener("payCycleSettingsUpdated", handlePayCycleSettingsUpdated);
    window.addEventListener("userTaxSettingsUpdated", handleUserTaxSettingsUpdated); // New listener


    return () => {
      window.removeEventListener("loansUpdated", handleLoansUpdated as EventListener);
      window.removeEventListener("savingPlansUpdated", handleSavingPlansUpdated as EventListener);
      window.removeEventListener("leaveRecordsUpdated", handleLeaveRecordsUpdated as EventListener);
      window.removeEventListener("timesheetsUpdated", handleTimesheetsUpdated as EventListener);
      window.removeEventListener("toDosUpdated", handleToDosUpdated as EventListener);
      window.removeEventListener("payslipsUpdated", handlePayslipsUpdated as EventListener);
      window.removeEventListener("workHoursSettingsUpdated", handleWorkHoursSettingsUpdated);
      window.removeEventListener("payCycleSettingsUpdated", handlePayCycleSettingsUpdated);
      window.removeEventListener("userTaxSettingsUpdated", handleUserTaxSettingsUpdated); // New cleanup
    };
  }, [isMockDataEnabled, refetchWorkHoursSettings, refetchPayCycleSettings, refetchUserTaxSettings]);


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
    pendingCount,
    companyDetails,
    isLoadingCompanyDetails,
    isMockDataEnabled,
    taxTables,
    isLoadingTaxTables,
    workHoursSettings: isMockDataEnabled ? mockWorkHoursSettings : workHoursSettings,
    isLoadingWorkHoursSettings,
    payCycleSettings: isMockDataEnabled ? mockPayCycleSettings : payCycleSettings,
    isLoadingPayCycleSettings,
    userTaxSettings: isMockDataEnabled ? mockUserTaxSettings : userTaxSettings, // Provide mock or live settings
    isLoadingUserTaxSettings,
    isLoadingEmployees,
    isMutatingEmployee,
    isLoadingLoans,
    isLoadingSavingPlans,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
    isLoadingToDos,
    isLoadingPayslips,
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
    activeTaxYearForCalculations, // Expose active tax year
    setActiveTaxYearForCalculations, // Expose setter for active tax year
  };
};