"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SavingPlan, MockEmployee } from "@/lib/mock-data-interfaces";
import { showSuccess, showError } from "@/utils/toast";

export const useSavingPlansData = (initialSavingPlans: SavingPlan[], employees: MockEmployee[], isMockDataEnabled: boolean) => {
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>(initialSavingPlans);

  useEffect(() => {
    setSavingPlans(initialSavingPlans);
  }, [initialSavingPlans]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const addSavingPlan = useCallback((newPlan: Omit<SavingPlan, 'id' | 'status'>) => {
    setSavingPlans(prevPlans => {
      const planId = `SAV-${Date.now()}`;
      const planToAdd: SavingPlan = {
        ...newPlan,
        id: planId,
        status: "active",
      };
      const updatedPlans = [...prevPlans, planToAdd];
      if (isMockDataEnabled) {
        localStorage.setItem("mockSavingPlans", JSON.stringify(updatedPlans));
        window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: updatedPlans }));
      }
      showSuccess("Savings plan added successfully!");
      return updatedPlans;
    });
  }, [isMockDataEnabled]);

  // You can add update/delete functions here if needed in the future

  return {
    savingPlans,
    getEmployeeName,
    addSavingPlan,
  };
};