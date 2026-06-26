"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { UserTaxSettings, fetchUserTaxSettingsFromSupabase, upsertUserTaxSettingsToSupabase } from "@/integrations/supabase/user-tax-settings-queries";
import { logger } from "@/lib/logger";

const LOCAL_STORAGE_KEY = "userTaxSettings"; // For mock data

interface UseUserTaxSettingsProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const defaultMockSettings: UserTaxSettings = {
  userId: 'mock-user',
  applyPaye: true,
  applySdl: true,
  enableIrp5Export: false,
  irp5ContentFontSize: 12,
  proRateUifCapByFrequency: true,
};

export const useUserTaxSettings = ({ isMockDataEnabled, isAuthenticated, isLoadingAuth }: UseUserTaxSettingsProps) => {
  const { user } = useAuth();
  const [userTaxSettings, setUserTaxSettings] = useState<UserTaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLiveSettings = useCallback(async () => {
    if (!user?.id) {
      logger.debug("useUserTaxSettings: fetchLiveSettings - no user ID, skipping fetch.");
      setUserTaxSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchUserTaxSettingsFromSupabase(user.id);
      setUserTaxSettings(data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveLiveSettings = useCallback(async (settings: Omit<UserTaxSettings, 'id' | 'userId'> & { id?: string }) => {
    if (!user?.id) {
      logger.error("useUserTaxSettings: saveLiveSettings - no user ID, cannot save settings.");
      showError("User not authenticated. Cannot save tax settings.");
      return null;
    }

    setIsLoading(true);
    try {
      const settingsToUpsert: UserTaxSettings = {
        ...settings,
        userId: user.id,
        id: settings.id,
      };
      const result = await upsertUserTaxSettingsToSupabase(settingsToUpsert);
      if (result) {
        setUserTaxSettings(result);
        showSuccess("Tax settings saved successfully!");
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
        setUserTaxSettings(JSON.parse(storedSettings));
      } else {
        setUserTaxSettings(defaultMockSettings); // Set default mock if none saved
      }
      setIsLoading(false);
    } else if (isAuthenticated) {
      fetchLiveSettings();
    } else {
      setUserTaxSettings(null);
      setIsLoading(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveSettings]);

  const saveUserTaxSettings = useCallback(async (settings: Omit<UserTaxSettings, 'id' | 'userId'> & { id?: string }) => {
    if (isMockDataEnabled) {
      const mockSettings: UserTaxSettings = {
        ...settings,
        userId: user?.id || 'mock-user',
        id: settings.id || 'mock-id',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockSettings));
      setUserTaxSettings(mockSettings);
      showSuccess("Tax settings saved locally (mock data)!");
      window.dispatchEvent(new Event('userTaxSettingsUpdated')); // Dispatch event for mock data
      return mockSettings;
    } else {
      const result = await saveLiveSettings(settings);
      if (result) {
        window.dispatchEvent(new Event('userTaxSettingsUpdated')); // Dispatch event for live data
      }
      return result;
    }
  }, [isMockDataEnabled, user, saveLiveSettings]);

  return {
    userTaxSettings,
    isLoadingUserTaxSettings: isLoading,
    saveUserTaxSettings,
    refetchUserTaxSettings: fetchLiveSettings,
  };
};