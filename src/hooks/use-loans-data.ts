"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loan, LoanDeductionHistoryEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation
import {
  fetchLoansFromSupabase,
  upsertLoanToSupabase,
  deleteLoanFromSupabase,
} from "@/integrations/supabase/loan-queries"; // Import new Supabase query functions

// Helper to convert snake_case to camelCase for Supabase data
const convertLoanKeysToCamelCase = (obj: object): Loan => {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    newObj[camelKey] = value;
  }
  return newObj as unknown as Loan;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertLoanKeysToSnakeCase = (obj: Partial<Loan>): Record<string, unknown> => {
  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = value;
  }
  return newObj;
};

interface UseLoansDataProps {
  initialLoans: Loan[];
  employees: MockEmployee[];
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const useLoansData = ({ initialLoans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth }: UseLoansDataProps) => {
  const [loans, setLoans] = useState<Loan[]>([]); // Initialize as empty, will be set by effect
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);

  // --- Live Loan Data Management (Supabase) ---
  const fetchLiveLoans = useCallback(async () => {
    setIsLoadingLoans(true);
    try {
      const data = await fetchLoansFromSupabase();
      setLoans(data);
    } finally {
      setIsLoadingLoans(false);
    }
  }, []);

  const upsertLiveLoan = useCallback(async (loanData: Loan) => {
    const toastId = showLoading(loanData.id ? "Updating loan..." : "Adding new loan...") as string;
    setIsLoadingLoans(true);
    try {
      const result = await upsertLoanToSupabase(loanData);
      if (result) {
        setLoans(prev => {
          const existingIndex = prev.findIndex(loan => loan.id === result.id);
          if (existingIndex !== -1) {
            return prev.map((loan, idx) => idx === existingIndex ? result : loan);
          } else {
            return [...prev, result];
          }
        });
        showSuccess("Loan saved successfully!");
        return result;
      } else {
        showError("Loan saved, but data could not be retrieved. Please refresh.");
        fetchLiveLoans(); // Refetch to ensure consistency
        return null;
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingLoans(false);
    }
  }, [fetchLiveLoans]);

  const deleteLiveLoan = useCallback(async (loanId: string) => {
    const toastId = showLoading("Deleting loan...") as string;
    setIsLoadingLoans(true);
    try {
      const success = await deleteLoanFromSupabase(loanId);
      if (success) {
        setLoans(prev => prev.filter(loan => loan.id !== loanId));
        showSuccess("Loan deleted successfully!");
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingLoans(false);
    }
  }, []);

  // Effect to load data based on mockDataEnabled status
  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingLoans(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      // Set mock data directly. The initialLoans prop is now a stable reference from usePayrollProcessor.
      setLoans(initialLoans);
      setIsLoadingLoans(false);
    } else if (isAuthenticated) {
      fetchLiveLoans();
    } else {
      // Not mock data, not authenticated, and auth is done loading
      setLoans([]);
      setIsLoadingLoans(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, initialLoans, fetchLiveLoans]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const addLoan = useCallback(async (newLoan: Omit<Loan, 'id' | 'status' | 'remainingBalance' | 'deductionHistory' | 'paused'> & { loanAmount: number; repaymentAmount: number }) => {
    const loanToAdd: Loan = {
      ...newLoan,
      id: uuidv4(), // Generate ID for both mock and live
      status: "active",
      remainingBalance: newLoan.loanAmount,
      paused: false,
      deductionHistory: [],
      freezeMode: null,
      freezeStartDate: null,
      freezeEndDate: null,
      freezeCyclesRemaining: null,
    };

    if (isMockDataEnabled) {
      setLoans(prevLoans => {
        const updatedLoans = [...prevLoans, loanToAdd];
        localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
        window.dispatchEvent(new CustomEvent('loansUpdated', { detail: updatedLoans }));
        showSuccess("Loan added successfully!");
        return updatedLoans;
      });
    } else {
      await upsertLiveLoan(loanToAdd);
    }
  }, [isMockDataEnabled, upsertLiveLoan]);

  const updateLoan = useCallback(async (updatedLoan: Loan) => {
    if (isMockDataEnabled) {
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan =>
          loan.id === updatedLoan.id ? updatedLoan : loan
        );
        localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
        window.dispatchEvent(new CustomEvent('loansUpdated', { detail: updatedLoans }));
        showSuccess("Loan updated successfully!");
        return updatedLoans;
      });
    } else {
      await upsertLiveLoan(updatedLoan);
    }
  }, [isMockDataEnabled, upsertLiveLoan]);

  const deleteLoan = useCallback(async (loanId: string) => {
    if (isMockDataEnabled) {
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.filter(loan => loan.id !== loanId);
        localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
        window.dispatchEvent(new CustomEvent('loansUpdated', { detail: updatedLoans }));
        showSuccess("Loan deleted successfully!");
        return updatedLoans;
      });
    } else {
      await deleteLiveLoan(loanId);
    }
  }, [isMockDataEnabled, deleteLiveLoan]);

  const togglePauseDeduction = useCallback(async (loanId: string, currentStatus: boolean) => {
    const loanToUpdate = loans.find(loan => loan.id === loanId);
    if (!loanToUpdate) {
      showError("Loan not found.");
      return;
    }

    const newPausedStatus = !currentStatus;
    const historyEntry: LoanDeductionHistoryEntry = {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      type: newPausedStatus ? "pause" : "deduction",
      notes: newPausedStatus ? "Deduction paused manually" : "Deduction resumed manually",
    };

    const updatedLoan: Loan = {
      ...loanToUpdate,
      paused: newPausedStatus,
      // "Pause" is the one-period skip mechanism. Clear any advanced freeze so they don't conflict.
      freezeMode: null,
      freezeStartDate: null,
      freezeEndDate: null,
      freezeCyclesRemaining: null,
      deductionHistory: [...loanToUpdate.deductionHistory, historyEntry],
    };

    if (isMockDataEnabled) {
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan =>
          loan.id === loanToUpdate.id ? updatedLoan : loan
        );
        localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
        window.dispatchEvent(new CustomEvent('loansUpdated', { detail: updatedLoans }));
        showSuccess(`Loan deduction ${currentStatus ? 'resumed' : 'paused'} successfully!`);
        return updatedLoans;
      });
    } else {
      await upsertLiveLoan(updatedLoan);
    }
  }, [loans, isMockDataEnabled, upsertLiveLoan]);

  const applyManualPayment = useCallback(async (loanId: string, amount: number, notes?: string) => {
    const loanToUpdate = loans.find(loan => loan.id === loanId);
    if (!loanToUpdate) {
      showError("Loan not found.");
      return;
    }

    const newBalance = loanToUpdate.remainingBalance - amount;
    const historyEntry: LoanDeductionHistoryEntry = {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: amount,
      type: "manual",
      notes: notes || "Manual payment applied",
    };

    const updatedLoan: Loan = {
      ...loanToUpdate,
      remainingBalance: Math.max(0, newBalance),
      status: (newBalance <= 0 ? "completed" : "active") as Loan["status"],
      deductionHistory: [...loanToUpdate.deductionHistory, historyEntry],
    };

    if (isMockDataEnabled) {
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan =>
          loan.id === loanToUpdate.id ? updatedLoan : loan
        );
        localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
        window.dispatchEvent(new CustomEvent('loansUpdated', { detail: updatedLoans }));
        showSuccess(`Manual payment of R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} applied!`);
        return updatedLoans;
      });
    } else {
      await upsertLiveLoan(updatedLoan);
    }
  }, [loans, isMockDataEnabled, upsertLiveLoan]);

  return {
    loans,
    getEmployeeName,
    getEmployeeCustomId,
    addLoan,
    updateLoan,
    deleteLoan,
    togglePauseDeduction,
    applyManualPayment,
    isLoadingLoans,
  };
};