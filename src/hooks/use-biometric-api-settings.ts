"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeFetchBiometricLogs } from "@/lib/fetch-biometric-logs";
import { DEFAULT_BIOMETRIC_API_URL } from "@/lib/biometric-attendance-parser";
import { validateOutboundHttpUrl } from "@/lib/url-security";
import { showError, showSuccess } from "@/utils/toast";

const LOCAL_STORAGE_KEY = "biometricApiUrl";

export interface BiometricApiSettings {
  apiUrl: string;
}

interface UseBiometricApiSettingsProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export function getStoredBiometricApiUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BIOMETRIC_API_URL;
  return localStorage.getItem(LOCAL_STORAGE_KEY) || DEFAULT_BIOMETRIC_API_URL;
}

export const useBiometricApiSettings = ({
  isMockDataEnabled,
  isAuthenticated,
  isLoadingAuth,
}: UseBiometricApiSettingsProps) => {
  const [settings, setSettings] = useState<BiometricApiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("company_details")
        .select("biometric_api_url")
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("Biometric API settings fetch failed:", error.message);
      }

      const apiUrl =
        (data as { biometric_api_url?: string | null } | null)?.biometric_api_url?.trim() ||
        getStoredBiometricApiUrl();

      setSettings({ apiUrl });
      localStorage.setItem(LOCAL_STORAGE_KEY, apiUrl);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(
    async (next: BiometricApiSettings) => {
      const apiUrl = next.apiUrl.trim();
      if (!apiUrl) {
        showError("Biometric API URL is required.");
        return false;
      }

      const urlCheck = validateOutboundHttpUrl(apiUrl);
      if (!urlCheck.ok) {
        showError(urlCheck.error);
        return false;
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, apiUrl);
      setSettings({ apiUrl });

      if (isMockDataEnabled) {
        showSuccess("Biometric API URL saved.");
        return true;
      }

      const { error } = await supabase.from("company_details").upsert(
        {
          id: "00000000-0000-0000-0000-000000000000",
          biometric_api_url: apiUrl,
        },
        { onConflict: "id" }
      );

      if (error) {
        // Column may not exist yet — localStorage still holds the value.
        if (!error.message.includes("biometric_api_url")) {
          showError(`Failed to save biometric API URL: ${error.message}`);
          return false;
        }
      }

      showSuccess("Biometric API URL saved.");
      window.dispatchEvent(new Event("companyDetailsUpdated"));
      return true;
    },
    [isMockDataEnabled]
  );

  const testConnection = useCallback(async (apiUrl: string) => {
    const urlCheck = validateOutboundHttpUrl(apiUrl);
    if (!urlCheck.ok) {
      throw new Error(urlCheck.error);
    }
    return invokeFetchBiometricLogs({ apiUrl: urlCheck.url.toString(), preview: true });
  }, []);

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    if (isMockDataEnabled) {
      setSettings({ apiUrl: getStoredBiometricApiUrl() });
      setIsLoading(false);
      return;
    }

    fetchLiveSettings();
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveSettings]);

  return {
    settings,
    isLoading,
    saveSettings,
    testConnection,
    refetch: fetchLiveSettings,
  };
};
