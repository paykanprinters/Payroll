"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import { showError } from "@/utils/toast";
import { recordPayment } from "@/integrations/supabase/payroll-savings-entries";

interface Params {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

/**
 * Live-first hook to load payroll savings entries and perform payments.
 * In mock mode, returns an empty list and a no-op record function.
 */
export function usePayrollSavingsEntries({ isMockDataEnabled, isAuthenticated, isLoadingAuth }: Params) {
  const [entries, setEntries] = useState<PayrollSavingsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (isMockDataEnabled || !isAuthenticated || isLoadingAuth) {
      setEntries([]);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("payroll_savings_entries")
      .select("*");

    if (error) {
      console.error("usePayrollSavingsEntries: fetch error:", error);
      showError("Failed to load payroll savings entries.");
    } else {
      const mapped: PayrollSavingsEntry[] = (data || []).map((row) => ({
        id: row.id,
        employeeId: row.employee_id,
        planId: row.plan_id,
        originalAmount: Number(row.original_amount),
        overrideAmount: row.override_amount !== null ? Number(row.override_amount) : null,
        amountPaid: Number(row.amount_paid),
        remainingBalance: Number(row.remaining_balance),
        status: row.status,
        paused: !!row.paused,
        pauseStartDate: row.pause_start_date,
        nextPaymentDate: row.next_payment_date,
        pauseReason: row.pause_reason,
        lastUpdated: row.last_updated,
        createdAt: row.created_at,
      }));
      setEntries(mapped);
    }
    setIsLoading(false);
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const recordSavingsPayment = useCallback(async (planId: string, amount: number) => {
    if (isMockDataEnabled) return; // no-op in mock
    await recordPayment(planId, amount);
    // Refresh entries after payment
    await fetchEntries();
  }, [isMockDataEnabled, fetchEntries]);

  return {
    payrollSavingsEntries: entries,
    isLoadingPayrollSavingsEntries: isLoading,
    refetchPayrollSavingsEntries: fetchEntries,
    recordSavingsPayment,
  };
}

export default usePayrollSavingsEntries;