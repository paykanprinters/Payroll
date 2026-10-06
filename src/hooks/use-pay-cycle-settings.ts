"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/use-auth";
import { PayCycleSettings, fetchPayCycleSettingsFromSupabase, upsertPayCycleSettingsToSupabase } from "@/integrations/supabase/pay-cycle-queries";
import { logger } from "@/lib/logger";

const LOCAL_STORAGE_KEY = "payCycleSettings";

interface UsePayCycleSettingsProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const defaultMockSettings: PayCycleSettings = {
  userId: 'mock-user',
  payCycleType: "Weekly",
  cutOffDay: 2, // Tuesday (1=Mon, 7=Sun)
  payDayOffset: 0, // Pay on cut-off day
};

export const usePayCycleSettings = ({ isMockDataEnabled, isAuthenticated, isLoadingAuth }: UsePayCycleSettingsProps) => {
  const { user } = useAuth();
  const [payCycleSettings, setPayCycleSettings] = useState<PayCycleSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLiveSettings = useCallback(async () => {
    if (!user?.id) {
      logger.debug("usePayCycleSettings: fetchLiveSettings - no user ID, skipping fetch.");
      setPayCycleSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchPayCycleSettingsFromSupabase();
      setPayCycleSettings(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveLiveSettings = useCallback(async (settings: Omit<PayCycleSettings, 'id' | 'userId'> & { id?: string }) => {
    if (!user?.id) {
      logger.error("usePayCycleSettings: saveLiveSettings - no user ID, cannot save settings.");
      showError("User not authenticated. Cannot save pay cycle settings.");
      return null;
    }
    if (user.role !== "Admin") {
      showError("Only an Admin can change the company pay cycle.");
      return null;
    }

    setIsLoading(true);
    try {
      const settingsToUpsert: PayCycleSettings = {
        ...settings,
        userId: user.id,
        id: settings.id,
      };
      const result = await upsertPayCycleSettingsToSupabase(settingsToUpsert);
      if (result) {
        setPayCycleSettings(result);
        showSuccess("Pay cycle settings saved successfully!");
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    if (isMockDataEnabled) {
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSettings) {
        setPayCycleSettings(JSON.parse(storedSettings));
      } else {
        setPayCycleSettings(defaultMockSettings); // Set default mock if none saved
      }
      setIsLoading(false);
    } else if (isAuthenticated) {
      fetchLiveSettings();
    } else {
      setPayCycleSettings(null);
      setIsLoading(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveSettings]);

  const savePayCycleSettings = useCallback(async (settings: Omit<PayCycleSettings, 'id' | 'userId'> & { id?: string }) => {
    if (isMockDataEnabled) {
      const mockSettings: PayCycleSettings = {
        ...settings,
        userId: user?.id || 'mock-user',
        id: settings.id || 'mock-id',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockSettings));
      setPayCycleSettings(mockSettings);
      showSuccess("Pay cycle settings saved locally (mock data)!");
      window.dispatchEvent(new Event('payCycleSettingsUpdated')); // Dispatch event for mock data
      return mockSettings;
    } else {
      const result = await saveLiveSettings(settings);
      if (result) {
        window.dispatchEvent(new Event('payCycleSettingsUpdated')); // Dispatch event for live data
      }
      return result;
    }
  }, [isMockDataEnabled, user, saveLiveSettings]);

  return {
    payCycleSettings,
    isLoadingPayCycleSettings: isLoading,
    savePayCycleSettings,
    refetchPayCycleSettings: fetchLiveSettings,
  };
};