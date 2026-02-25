"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

import { useCompanyDetails } from "./use-company-details";
import { useTaxTables } from "./use-tax-tables";
import { useWorkHoursSettings } from "./use-work-hours-settings";
import { usePublicHolidays } from "./use-public-holidays";
import { usePayCycleSettings } from "./use-pay-cycle-settings";
import { useUserTaxSettings } from "./use-user-tax-settings";
import { useEmployeesData } from "./use-employees-data";
import { usePayslipsData } from "./use-payslips-data";
import { useLoansData } from "./use-loans-data";
import { useSavingPlansData } from "./use-saving-plans-data";
import usePayrollSavingsEntries from "./use-payroll-savings-entries";
import { useLeaveData } from "./use-leave-data";
import { useTimesheetData } from "./use-timesheet-data";
import { useToDosData } from "./use-todos-data";
import { useCompensationComponents } from "./use-compensation-components";
import { useOvertimeRules } from "./use-overtime-rules";
import { usePayrollProcessingLogic } from "./use-payroll-processing-logic";

import {
  MockPayslip,
  Loan,
  SavingPlan,
  LeaveEntry,
  TimesheetEntry,
  ToDoEntry,
} from "@/lib/mock-data-interfaces";

// Re-export TaxTables interface from use-tax-tables
export type { TaxTables } from "./use-tax-tables";

export const usePayrollProcessor = (options?: { silent?: boolean }) => {
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const silent = options?.silent === true;

  // Mock mode removed: always live-only
  const isMockDataEnabled = false;

  const [activeTaxYearForCalculations, setActiveTaxYearState] = useState<number>(new Date().getFullYear());

  const hasTriggeredGenerateToDosRef = useRef(false);
  const isGeneratingToDosRef = useRef(false);
  const refetchToDosFnRef = useRef<(() => void) | null>(null);

  const triggerGenerateToDos = useCallback(async () => {
    if (!isAuthenticated) return;
    // Only Admins may generate To-Dos (edge function enforces Admin)
    if (user?.role !== "Admin") return;

    try {
      const { error } = await supabase.functions.invoke("generate-todos");
      if (error) {
        showError(`Failed to generate To-Dos: ${error.message}`);
      } else {
        refetchToDosFnRef.current?.();
        showSuccess("To-Dos refreshed successfully!");
      }
    } catch (error: any) {
      showError(`An unexpected error occurred while generating To-Dos: ${error.message}`);
    }
  }, [isAuthenticated, user?.role]);

  const safeTriggerGenerateToDos = useCallback(async () => {
    if (isGeneratingToDosRef.current) return;
    isGeneratingToDosRef.current = true;
    try {
      await triggerGenerateToDos();
      hasTriggeredGenerateToDosRef.current = true;
    } finally {
      isGeneratingToDosRef.current = false;
    }
  }, [triggerGenerateToDos]);

  const { companyDetails: supabaseCompanyDetails, isLoading: isLoadingCompanyDetails, refetchCompanyDetails, upsertCompanyDetails } =
    useCompanyDetails({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const { taxTables, isLoadingTaxTables, refetchTaxTables } = useTaxTables({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
    activeTaxYear: activeTaxYearForCalculations,
  });

  const { workHoursSettings, isLoadingWorkHoursSettings, saveWorkHoursSettings, refetchWorkHoursSettings } = useWorkHoursSettings({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { publicHolidays, isLoadingPublicHolidays, saveHoliday, deleteHoliday, importDefaultSouthAfricanHolidays } = usePublicHolidays({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { payCycleSettings, isLoadingPayCycleSettings, savePayCycleSettings, refetchPayCycleSettings } = usePayCycleSettings({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { userTaxSettings, isLoadingUserTaxSettings, saveUserTaxSettings, refetchUserTaxSettings } = useUserTaxSettings({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const companyDetails = supabaseCompanyDetails;

  useEffect(() => {
    const liveYear = companyDetails?.activeTaxYear;
    if (typeof liveYear === "number" && liveYear > 0 && liveYear !== activeTaxYearForCalculations) {
      setActiveTaxYearState(liveYear);
    }
  }, [companyDetails, activeTaxYearForCalculations]);

  const setActiveTaxYearForCalculations = useCallback(
    (year: number) => {
      setActiveTaxYearState(year);
      upsertCompanyDetails({ activeTaxYear: year });
    },
    [upsertCompanyDetails]
  );

  const companyNameForEmployeeId = useMemo(() => {
    return companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Company";
  }, [companyDetails]);

  // Live collections. (initial* are ignored when not in mock mode)
  const { employees, isLoadingEmployees, isMutatingEmployee, addOrUpdateEmployee: baseAddOrUpdateEmployee, deleteEmployee: baseDeleteEmployee, refetchEmployees } =
    useEmployeesData({ isMockDataEnabled, companyName: companyNameForEmployeeId, isAuthenticated, isLoadingAuth });

  const emptyPayslips = useMemo<MockPayslip[]>(() => [], []);
  const emptyLoans = useMemo<Loan[]>(() => [], []);
  const emptySavingPlans = useMemo<SavingPlan[]>(() => [], []);
  const emptyLeaveRecords = useMemo<LeaveEntry[]>(() => [], []);
  const emptyTimesheets = useMemo<TimesheetEntry[]>(() => [], []);
  const emptyToDos = useMemo<ToDoEntry[]>(() => [], []);

  const { payslips, setPayslips, isLoadingPayslips, upsertPayslip, batchUpsertPayslips, refetchPayslips } = usePayslipsData({
    initialPayslips: emptyPayslips,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { earningComponents, deductionComponents, assignments, isLoading: isLoadingComponents, refetch: refetchComponents } = useCompensationComponents();
  const { rules: overtimeRules, isLoading: isLoadingOvertimeRules, refetch: refetchOvertimeRules } = useOvertimeRules();

  const { loans, isLoadingLoans, addLoan, updateLoan, deleteLoan, togglePauseDeduction, applyManualPayment } = useLoansData({
    initialLoans: emptyLoans,
    employees,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { savingPlans, isLoadingSavingPlans, addSavingPlan, updateSavingPlan } = useSavingPlansData({
    initialSavingPlans: emptySavingPlans,
    employees,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { payrollSavingsEntries, isLoadingPayrollSavingsEntries, recordSavingsPayment, refetchPayrollSavingsEntries } = usePayrollSavingsEntries({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { leaveRecords, isLoadingLeaveRecords, addLeaveRecord } = useLeaveData({
    initialLeaveRecords: emptyLeaveRecords,
    employees,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const { timesheets, isLoadingTimesheets, addOrUpdateTimesheet, deleteTimesheet, updateTimesheetStatus, addTimesheetBatch } = useTimesheetData({
    initialTimesheets: emptyTimesheets,
    employees,
    leaveRecords,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
    workHoursSettings,
  });

  const { toDos, pendingCount, isLoadingToDos, markToDoAsDone, refetchToDos } = useToDosData({
    initialToDos: emptyToDos,
    isMockDataEnabled,
    employees,
    addOrUpdateEmployee: baseAddOrUpdateEmployee,
    isAuthenticated,
    isLoadingAuth,
  });

  refetchToDosFnRef.current = refetchToDos;

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
    workHoursSettings || null,
    publicHolidays || [],
    companyDetails || null,
    setPayslips,
    updateLoan,
    updateSavingPlan,
    updateTimesheetStatus,
    batchUpsertPayslips,
    recordSavingsPayment,
    isMockDataEnabled,
    earningComponents,
    deductionComponents,
    assignments,
    overtimeRules || undefined
  );

  // Initial To-Do generation when live + authenticated
  useEffect(() => {
    if (silent) return;
    if (!isAuthenticated || isLoadingAuth) return;

    if (!hasTriggeredGenerateToDosRef.current) {
      safeTriggerGenerateToDos();
    }
  }, [isAuthenticated, isLoadingAuth, safeTriggerGenerateToDos, silent]);

  // Central soft-refresh when app regains focus/visibility
  useEffect(() => {
    const lastRefetchTsRef = { current: 0 } as { current: number };
    const MIN_INTERVAL = 10000; // 10s throttle

    const handler = () => {
      const now = Date.now();
      if (now - lastRefetchTsRef.current < MIN_INTERVAL) return;
      lastRefetchTsRef.current = now;

      if (!isAuthenticated || isLoadingAuth) return;

      // Prevent re-entrancy across pages for a few seconds
      const w = window as any;
      if (w.__appRefreshInProgress) return;
      w.__appRefreshInProgress = true;
      setTimeout(() => {
        w.__appRefreshInProgress = false;
      }, 5000);

      refetchCompanyDetails?.();
      refetchTaxTables?.(activeTaxYearForCalculations);
      refetchWorkHoursSettings?.();
      refetchPayCycleSettings?.();
      refetchUserTaxSettings?.();
      refetchPayslips?.();
      refetchPayrollSavingsEntries?.();
      refetchToDosFnRef.current?.();
      refetchComponents?.();
      refetchOvertimeRules?.();

      try {
        typeof refetchEmployees === "function" && refetchEmployees();
      } catch {
        // allow hook-level errors to surface
      }
    };

    window.addEventListener("appFocusRefresh", handler);
    return () => {
      window.removeEventListener("appFocusRefresh", handler);
    };
  }, [
    isAuthenticated,
    isLoadingAuth,
    refetchCompanyDetails,
    refetchTaxTables,
    refetchWorkHoursSettings,
    refetchPayCycleSettings,
    refetchUserTaxSettings,
    refetchPayslips,
    refetchPayrollSavingsEntries,
    refetchEmployees,
    activeTaxYearForCalculations,
  ]);

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
    workHoursSettings,
    isLoadingWorkHoursSettings,
    isLoadingPublicHolidays,
    payCycleSettings,
    isLoadingPayCycleSettings,
    userTaxSettings,
    isLoadingUserTaxSettings,
    isLoadingEmployees,
    isMutatingEmployee,
    isLoadingLoans,
    isLoadingSavingPlans,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
    isLoadingToDos,
    isLoadingPayslips,
    payrollSavingsEntries,
    isLoadingPayrollSavingsEntries,
    isLoadingComponents,
    isLoadingOvertimeRules,
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
    refetchEmployees,
    refetchPayslips,
    refetchPayrollSavingsEntries,
    activeTaxYearForCalculations,
    setActiveTaxYearForCalculations,
    publicHolidays,
    saveHoliday,
    deleteHoliday,
    importDefaultSouthAfricanHolidays,
  };
};