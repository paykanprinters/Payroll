"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SavingPlan, MockEmployee } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { logAuditEvent } from "@/utils/audit";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation
import {
  fetchSavingPlansFromSupabase,
  upsertSavingPlanToSupabase,
  deleteSavingPlanFromSupabase,
} from "@/integrations/supabase/saving-queries";
import { logger, toLogError } from "@/lib/logger";

// Helper to convert snake_case to camelCase for Supabase data
const convertSavingPlanKeysToCamelCase = (obj: object): SavingPlan => {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    newObj[camelKey] = value;
  }
  return newObj as unknown as SavingPlan;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertSavingPlanKeysToSnakeCase = (obj: Partial<SavingPlan>): Record<string, unknown> => {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = value;
  }
  return newObj;
};

interface UseSavingPlansDataProps {
  initialSavingPlans: SavingPlan[];
  employees: MockEmployee[];
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const useSavingPlansData = ({ initialSavingPlans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth }: UseSavingPlansDataProps) => {
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]); // Initialize as empty
  const [isLoadingSavingPlans, setIsLoadingSavingPlans] = useState(true);

  // --- Live Saving Plan Data Management (Supabase) ---
  const fetchLiveSavingPlans = useCallback(async () => {
    setIsLoadingSavingPlans(true);
    try {
      logger.debug("useSavingPlansData: fetching live saving plans");
      const data = await fetchSavingPlansFromSupabase();
      setSavingPlans(data);
    } finally {
      setIsLoadingSavingPlans(false);
    }
  }, []);

  const upsertLiveSavingPlan = useCallback(async (savingPlanData: SavingPlan): Promise<boolean> => {
    const toastId = showLoading(savingPlanData.id ? "Updating saving plan..." : "Adding new saving plan...") as string;
    setIsLoadingSavingPlans(true);
    try {
      const snakeCasePayload = convertSavingPlanKeysToSnakeCase(savingPlanData);
      logger.debug("useSavingPlansData: upserting live saving plan");

      const { data, error } = await supabase
        .from('saving_plans')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      if (error) {
        logger.error("useSavingPlansData: error upserting live saving plan:", toLogError(error));
        showError(`Failed to save saving plan: ${toLogError(error)}`);
        return false;
      } else if (data && data.length > 0) {
        const camelCaseData = convertSavingPlanKeysToCamelCase(data[0]);
        setSavingPlans(prev => {
          const existingIndex = prev.findIndex(plan => plan.id === camelCaseData.id);
          if (existingIndex !== -1) {
            return prev.map((plan, idx) => idx === existingIndex ? camelCaseData : plan);
          } else {
            return [...prev, camelCaseData];
          }
        });
        showSuccess("Savings plan saved successfully!");
        return true;
      } else {
        logger.warn("useSavingPlansData: upsert succeeded but returned no data. Refetching to ensure consistency.");
        showError("Savings plan saved, but data could not be retrieved. Please refresh.");
        fetchLiveSavingPlans();
        return false;
      }
    } catch (err) {
      logger.error("useSavingPlansData: unhandled error upserting live saving plan:", toLogError(err));
      showError("An unexpected error occurred while saving saving plan data.");
      return false;
    } finally {
      dismissToast(toastId);
      setIsLoadingSavingPlans(false);
    }
  }, [fetchLiveSavingPlans]);

  // Effect to load data based on mockDataEnabled status
  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingSavingPlans(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      // Set mock data directly. The initialSavingPlans prop is now a stable reference from usePayrollProcessor.
      setSavingPlans(initialSavingPlans);
      setIsLoadingSavingPlans(false);
    } else if (isAuthenticated) {
      fetchLiveSavingPlans();
    } else {
      // Not mock data, not authenticated, and auth is done loading
      setSavingPlans([]);
      setIsLoadingSavingPlans(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, initialSavingPlans, fetchLiveSavingPlans]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const addSavingPlan = useCallback(async (newPlan: Omit<SavingPlan, 'id' | 'status'>) => {
    const planToAdd: SavingPlan = {
      ...newPlan,
      id: uuidv4(), // Generate ID for both mock and live
      status: "active",
    };

    if (isMockDataEnabled) {
      setSavingPlans(prevPlans => {
        const updatedPlans = [...prevPlans, planToAdd];
        localStorage.setItem("mockSavingPlans", JSON.stringify(updatedPlans));
        window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: updatedPlans }));
        showSuccess("Savings plan added successfully!");
        return updatedPlans;
      });
    } else {
      await upsertLiveSavingPlan(planToAdd);
    }
  }, [isMockDataEnabled, upsertLiveSavingPlan]);

  const updateSavingPlan = useCallback(async (updatedPlan: SavingPlan): Promise<boolean> => {
    if (isMockDataEnabled) {
      setSavingPlans(prevPlans => {
        const updatedPlans = prevPlans.map(plan =>
          plan.id === updatedPlan.id ? updatedPlan : plan
        );
        localStorage.setItem("mockSavingPlans", JSON.stringify(updatedPlans));
        window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: updatedPlans }));
        showSuccess("Savings plan updated successfully!");
        return updatedPlans;
      });
      return true;
    }
    return upsertLiveSavingPlan(updatedPlan);
  }, [isMockDataEnabled, upsertLiveSavingPlan]);

  const deleteSavingPlan = useCallback(async (plan: SavingPlan) => {
    const toastId = showLoading("Deleting savings plan...") as string;
    setIsLoadingSavingPlans(true);
    try {
      const employeeName = getEmployeeName(plan.employeeId);
      const employeeCustomId = getEmployeeCustomId(plan.employeeId);
      const actionText = `Deleted savings plan for ${employeeName} (${employeeCustomId}) amount R ${plan.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} ${plan.frequency}`;

      if (isMockDataEnabled) {
        setSavingPlans(prev => {
          const updated = prev.filter(p => p.id !== plan.id);
          localStorage.setItem("mockSavingPlans", JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: updated }));
          return updated;
        });
        showSuccess("Savings plan deleted successfully!");
        await logAuditEvent(actionText);
      } else {
        const ok = await deleteSavingPlanFromSupabase(plan.id);
        if (ok) {
          setSavingPlans(prev => prev.filter(p => p.id !== plan.id));
          showSuccess("Savings plan deleted successfully!");
          await logAuditEvent(actionText);
        }
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingSavingPlans(false);
    }
  }, [isMockDataEnabled, getEmployeeName, getEmployeeCustomId]);

  return {
    savingPlans,
    getEmployeeName,
    getEmployeeCustomId,
    addSavingPlan,
    updateSavingPlan,
    deleteSavingPlan,
    isLoadingSavingPlans,
  };
};