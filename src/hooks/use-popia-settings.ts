"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_POPIA_SETTINGS,
  fetchPopiaSettings,
  upsertPopiaSettings,
  type PopiaSettings,
} from "@/integrations/supabase/popia-queries";
import { showError, showSuccess } from "@/utils/toast";

interface UsePopiaSettingsProps {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  userId?: string;
}

export function usePopiaSettings({ isAuthenticated, isLoadingAuth, userId }: UsePopiaSettingsProps) {
  const [settings, setSettings] = useState<PopiaSettings>(DEFAULT_POPIA_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await fetchPopiaSettings();
      if (loaded) setSettings(loaded);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(
    async (next: PopiaSettings) => {
      setIsSaving(true);
      try {
        const result = await upsertPopiaSettings(next, userId);
        if (!result.ok) {
          showError(`Failed to save POPIA settings: ${result.error ?? "Unknown error"}`);
          return false;
        }
        setSettings(next);
        showSuccess("POPIA settings saved.");
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setSettings(DEFAULT_POPIA_SETTINGS);
      setIsLoading(false);
      return;
    }
    refetch();
  }, [isAuthenticated, isLoadingAuth, refetch]);

  return { settings, setSettings, isLoading, isSaving, save, refetch };
}
