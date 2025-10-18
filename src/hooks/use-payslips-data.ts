"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import {
  fetchPayslipsFromSupabase,
  upsertPayslipToSupabase,
  batchUpsertPayslipsToSupabase,
} from "@/integrations/supabase/payslip-queries";

interface UsePayslipsDataProps {
  initialPayslips: MockPayslip[];
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const usePayslipsData = ({ initialPayslips, isMockDataEnabled, isAuthenticated, isLoadingAuth }: UsePayslipsDataProps) => {
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [isLoadingPayslips, setIsLoadingPayslips] = useState(true);

  // --- Live Payslip Data Management (Supabase) ---
  const fetchLivePayslips = useCallback(async () => {
    setIsLoadingPayslips(true);
    try {
      const data = await fetchPayslipsFromSupabase();
      setPayslips(data);
    } finally {
      setIsLoadingPayslips(false);
    }
  }, []);

  const upsertLivePayslip = useCallback(async (payslipData: MockPayslip): Promise<MockPayslip | null> => {
    const toastId = showLoading(payslipData.id ? "Updating payslip..." : "Adding new payslip...") as string;
    setIsLoadingPayslips(true);
    try {
      const result = await upsertPayslipToSupabase(payslipData);
      if (result) {
        setPayslips(prev => {
          const existingIndex = prev.findIndex(ps => ps.id === result.id);
          if (existingIndex !== -1) {
            return prev.map((ps, idx) => idx === existingIndex ? result : ps);
          } else {
            return [...prev, result];
          }
        });
        showSuccess("Payslip saved successfully!");
        return result;
      } else {
        showError("Payslip saved, but data could not be retrieved. Please refresh.");
        fetchLivePayslips(); // Refetch to ensure consistency
        return null;
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingPayslips(false);
    }
  }, [fetchLivePayslips]);

  const batchUpsertLivePayslips = useCallback(async (payslipsToUpsert: MockPayslip[]): Promise<boolean> => {
    const toastId = showLoading(`Saving ${payslipsToUpsert.length} payslips...`) as string;
    setIsLoadingPayslips(true);
    try {
      const success = await batchUpsertPayslipsToSupabase(payslipsToUpsert);
      if (success) {
        showSuccess(`${payslipsToUpsert.length} payslips saved successfully!`);
        fetchLivePayslips(); // Re-fetch all to update state
        return true;
      } else {
        showError("Failed to save payslips in batch.");
        return false;
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingPayslips(false);
    }
  }, [fetchLivePayslips]);

  // Effect to load data based on mockDataEnabled status
  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingPayslips(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      setPayslips(initialPayslips);
      setIsLoadingPayslips(false);
    } else if (isAuthenticated) {
      fetchLivePayslips();
    } else {
      setPayslips([]);
      setIsLoadingPayslips(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, initialPayslips, fetchLivePayslips]);

  return {
    payslips,
    setPayslips, // Expose setPayslips for internal mock data updates
    isLoadingPayslips,
    upsertPayslip: upsertLivePayslip,
    batchUpsertPayslips: batchUpsertLivePayslips,
    refetchPayslips: fetchLivePayslips,
  };
};