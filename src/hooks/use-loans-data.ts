"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loan, LoanDeductionHistoryEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation

// Helper to convert snake_case to camelCase for Supabase data
const convertLoanKeysToCamelCase = (obj: any): Loan => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as Loan;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertLoanKeysToSnakeCase = (obj: Partial<Loan>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
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
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);

  // --- Live Loan Data Management (Supabase) ---
  const fetchLiveLoans = useCallback(async () => {
    setIsLoadingLoans(true);
    try {
      console.log("useLoansData: Fetching live loans from Supabase...");
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error("useLoansData: Error fetching live loans:", error);
        showError("Failed to load live loan data.");
        setLoans([]);
      } else {
        const camelCaseData = data.map(convertLoanKeysToCamelCase);
        console.log("useLoansData: Live loans fetched:", camelCaseData);
        setLoans(camelCaseData);
      }
    } catch (err) {
      console.error("useLoansData: Unhandled error fetching live loans:", err);
      showError("An unexpected error occurred while loading live loan data.");
      setLoans([]);
    } finally {
      setIsLoadingLoans(false);
    }
  }, []);

  const upsertLiveLoan = useCallback(async (loanData: Loan) => {
    const toastId = showLoading(loanData.id ? "Updating loan..." : "Adding new loan...") as string;
    setIsLoadingLoans(true);
    try {
      const snakeCasePayload = convertLoanKeysToSnakeCase(loanData);
      console.log("useLoansData: Upserting live loan with payload:", snakeCasePayload);

      const { data, error } = await supabase
        .from('loans')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("useLoansData: Error upserting live loan:", error);
        showError(`Failed to save loan: ${error.message}`);
      } else if (data && data.length > 0) {
        const camelCaseData = convertLoanKeysToCamelCase(data[0]);
        setLoans(prev => {
          const existingIndex = prev.findIndex(loan => loan.id === camelCaseData.id);
          if (existingIndex !== -1) {
            return prev.map((loan, idx) => idx === existingIndex ? camelCaseData : loan);
          } else {
            return [...prev, camelCaseData];
          }
        });
        showSuccess("Loan saved successfully!");
      } else {
        console.warn("useLoansData: Upsert succeeded but returned no data. Refetching to ensure consistency.");
        showError("Loan saved, but data could not be retrieved. Please refresh.");
        fetchLiveLoans();
      }
    } catch (err) {
      console.error("useLoansData: Unhandled error upserting live loan:", err);
      showError("An unexpected error occurred while saving loan data.");
    } finally {
      dismissToast(toastId);
      setIsLoadingLoans(false);
    }
  }, [fetchLiveLoans]);

  const deleteLiveLoan = useCallback(async (loanId: string) => {
    const toastId = showLoading("Deleting loan...") as string;
    setIsLoadingLoans(true);
    try {
      console.log("useLoansData: Deleting live loan with ID:", loanId);
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId);

      if (error) {
        console.error("useLoansData: Error deleting live loan:", error);
        showError(`Failed to delete loan: ${error.message}`);
      } else {
        setLoans(prev => prev.filter(loan => loan.id !== loanId));
        showSuccess("Loan deleted successfully!");
      }
    } catch (err) {
      console.error("useLoansData: Unhandled error deleting live loan:", err);
      showError("An unexpected error occurred while deleting loan data.");
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
      deductionHistory: [...loanToUpdate.deductionHistory, historyEntry],
    };

    if (isMockDataEnabled) {
      setLoans(prevLoans => {
        const updatedLoans = prevLoans.map(loan =>
          loan.id === loanId ? updatedLoan : loan
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
          loan.id === loanId ? updatedLoan : loan
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