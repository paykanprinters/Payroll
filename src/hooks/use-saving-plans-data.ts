"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SavingPlan, MockEmployee } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation
import {
  fetchSavingPlansFromSupabase,
  upsertSavingPlanToSupabase,
} from "@/integrations/supabase/saving-queries"; // Import new Supabase query functions

// Helper to convert snake_case to camelCase for Supabase data
const convertSavingPlanKeysToCamelCase = (obj: any): SavingPlan => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as SavingPlan;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertSavingPlanKeysToSnakeCase = (obj: Partial<SavingPlan>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
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
      console.log("useSavingPlansData: Fetching live saving plans from Supabase...");
      const data = await fetchSavingPlansFromSupabase();
      setSavingPlans(data);
    } finally {
      setIsLoadingSavingPlans(false);
    }
  }, []);

  const upsertLiveSavingPlan = useCallback(async (savingPlanData: SavingPlan) => {
    const toastId = showLoading(savingPlanData.id ? "Updating saving plan..." : "Adding new saving plan...") as string;
    setIsLoadingSavingPlans(true);
    try {
      const snakeCasePayload = convertSavingPlanKeysToSnakeCase(savingPlanData);
      console.log("useSavingPlansData: Upserting live saving plan with payload:", snakeCasePayload);

      const { data, error } = await supabase
        .from('saving_plans')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("useSavingPlansData: Error upserting live saving plan:", error);
        showError(`Failed to save saving plan: ${error.message}`);
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
      } else {
        console.warn("useSavingPlansData: Upsert succeeded but returned no data. Refetching to ensure consistency.");
        showError("Savings plan saved, but data could not be retrieved. Please refresh.");
        fetchLiveSavingPlans();
      }
    } catch (err) {
      console.error("useSavingPlansData: Unhandled error upserting live saving plan:", err);
      showError("An unexpected error occurred while saving saving plan data.");
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

  const updateSavingPlan = useCallback(async (updatedPlan: SavingPlan) => {
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
    } else {
      await upsertLiveSavingPlan(updatedPlan);
    }
  }, [isMockDataEnabled, upsertLiveSavingPlan]);

  return {
    savingPlans,
    getEmployeeName,
    getEmployeeCustomId,
    addSavingPlan,
    updateSavingPlan,
    isLoadingSavingPlans,
  };
};