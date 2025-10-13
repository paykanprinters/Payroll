"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loan, LoanDeductionHistoryEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";

export const useLoansData = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<MockEmployee[]>([]);

  const loadLoans = useCallback(() => {
    const storedLoans = localStorage.getItem("mockLoans");
    setLoans(storedLoans ? JSON.parse(storedLoans) : []);
    const storedEmployees = localStorage.getItem("mockEmployees");
    setEmployees(storedEmployees ? JSON.parse(storedEmployees) : []);
  }, []);

  useEffect(() => {
    loadLoans();
    window.addEventListener('mockDataUpdated', loadLoans);
    return () => {
      window.removeEventListener('mockDataUpdated', loadLoans);
    };
  }, [loadLoans]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const addLoan = useCallback((newLoan: Omit<Loan, 'id' | 'status' | 'remainingBalance' | 'deductionHistory' | 'paused'> & { loanAmount: number; repaymentAmount: number }) => {
    setLoans(prevLoans => {
      const loanId = `LOAN-${Date.now()}`;
      const loanToAdd: Loan = {
        ...newLoan,
        id: loanId,
        status: "active",
        remainingBalance: newLoan.loanAmount,
        paused: false,
        deductionHistory: [],
      };
      const updatedLoans = [...prevLoans, loanToAdd];
      localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
      window.dispatchEvent(new Event('mockDataUpdated'));
      showSuccess("Loan added successfully!");
      return updatedLoans;
    });
  }, []);

  const updateLoan = useCallback((updatedLoan: Loan) => {
    setLoans(prevLoans => {
      const updatedLoans = prevLoans.map(loan =>
        loan.id === updatedLoan.id ? updatedLoan : loan
      );
      localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
      window.dispatchEvent(new Event('mockDataUpdated'));
      showSuccess("Loan updated successfully!");
      return updatedLoans;
    });
  }, []);

  const deleteLoan = useCallback((loanId: string) => {
    setLoans(prevLoans => {
      const updatedLoans = prevLoans.filter(loan => loan.id !== loanId);
      localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
      window.dispatchEvent(new Event('mockDataUpdated'));
      showSuccess("Loan deleted successfully!");
      return updatedLoans;
    });
  }, []);

  const togglePauseDeduction = useCallback((loanId: string, currentStatus: boolean) => {
    setLoans(prevLoans => {
      const updatedLoans = prevLoans.map(loan => {
        if (loan.id === loanId) {
          const newPausedStatus = !currentStatus;
          const historyEntry: LoanDeductionHistoryEntry = {
            date: format(new Date(), 'yyyy-MM-dd'),
            amount: 0,
            type: newPausedStatus ? "pause" : "deduction", // 'deduction' type for resume, though no amount
            notes: newPausedStatus ? "Deduction paused manually" : "Deduction resumed manually",
          };
          return {
            ...loan,
            paused: newPausedStatus,
            deductionHistory: [...loan.deductionHistory, historyEntry],
          };
        }
        return loan;
      });
      localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
      window.dispatchEvent(new Event('mockDataUpdated'));
      showSuccess(`Loan deduction ${currentStatus ? 'resumed' : 'paused'} successfully!`);
      return updatedLoans;
    });
  }, []);

  const applyManualPayment = useCallback((loanId: string, amount: number, notes?: string) => {
    setLoans(prevLoans => {
      const updatedLoans = prevLoans.map(loan => {
        if (loan.id === loanId) {
          const newBalance = loan.remainingBalance - amount;
          const historyEntry: LoanDeductionHistoryEntry = {
            date: format(new Date(), 'yyyy-MM-dd'),
            amount: amount,
            type: "manual",
            notes: notes || "Manual payment applied",
          };
          return {
            ...loan,
            remainingBalance: Math.max(0, newBalance),
            status: newBalance <= 0 ? "completed" : "active",
            deductionHistory: [...loan.deductionHistory, historyEntry],
          };
        }
        return loan;
      });
      localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
      window.dispatchEvent(new Event('mockDataUpdated'));
      showSuccess(`Manual payment of R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} applied!`);
      return updatedLoans;
    });
  }, []);

  return {
    loans,
    employees,
    getEmployeeName,
    addLoan,
    updateLoan,
    deleteLoan,
    togglePauseDeduction,
    applyManualPayment,
    loadLoans,
  };
};