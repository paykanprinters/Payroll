"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  fetchNotificationSettings,
  upsertNotificationSettings,
  type NotificationSettings,
} from "@/integrations/supabase/notification-queries";
import { showError, showSuccess } from "@/utils/toast";

interface UseNotificationSettingsProps {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  userId?: string;
}

export function useNotificationSettings({
  isAuthenticated,
  isLoadingAuth,
  userId,
}: UseNotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await fetchNotificationSettings();
      if (loaded) setSettings(loaded);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(
    async (next: NotificationSettings) => {
      setIsSaving(true);
      try {
        const result = await upsertNotificationSettings(next, userId);
        if (!result.ok) {
          showError(`Failed to save notification settings: ${result.error ?? "Unknown error"}`);
          return false;
        }
        setSettings(next);
        showSuccess("Notification settings saved.");
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
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
      setIsLoading(false);
      return;
    }
    refetch();
  }, [isAuthenticated, isLoadingAuth, refetch]);

  return { settings, setSettings, isLoading, isSaving, save, refetch };
}
