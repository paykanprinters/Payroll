"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

export interface WorkHoursSettings {
  id?: string;
  userId: string;
  dailyStartTime: string;
  dailyEndTime: string;
  fridayStartTime?: string;
  fridayEndTime?: string;
  breakDurationMinutes?: number;
  workDays: string[];
  overtimeThresholdHours?: number;
}

const LOCAL_STORAGE_KEY = "workHoursSettings";

interface UseWorkHoursSettingsProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export const useWorkHoursSettings = ({ isMockDataEnabled, isAuthenticated, isLoadingAuth }: UseWorkHoursSettingsProps) => {
  const { user } = useAuth();
  const [workHoursSettings, setWorkHoursSettings] = useState<WorkHoursSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLiveSettings = useCallback(async () => {
    if (!user?.id) {
      setWorkHoursSettings(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_hours_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
        console.error("useWorkHoursSettings: Error fetching live settings:", error);
        showError("Failed to load work hours settings.");
        setWorkHoursSettings(null);
      } else if (data) {
        // Convert snake_case to camelCase
        const camelCaseData: WorkHoursSettings = {
          id: data.id,
          userId: data.user_id,
          dailyStartTime: data.daily_start_time,
          dailyEndTime: data.daily_end_time,
          fridayStartTime: data.friday_start_time || undefined,
          fridayEndTime: data.friday_end_time || undefined,
          breakDurationMinutes: data.break_duration_minutes || undefined,
          workDays: data.work_days || [],
          overtimeThresholdHours: data.overtime_threshold_hours || undefined,
        };
        setWorkHoursSettings(camelCaseData);
      } else {
        setWorkHoursSettings(null); // No settings found for user
      }
    } catch (err) {
      console.error("useWorkHoursSettings: Unhandled error fetching live settings:", err);
      showError("An unexpected error occurred while loading work hours settings.");
      setWorkHoursSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const upsertLiveSettings = useCallback(async (settings: Omit<WorkHoursSettings, 'id'> & { id?: string }) => {
    if (!user?.id) {
      showError("User not authenticated. Cannot save work hours settings.");
      return null;
    }

    setIsLoading(true);
    try {
      // Convert camelCase to snake_case for Supabase
      const payload = {
        id: settings.id, // Include ID for upsert
        user_id: user.id,
        daily_start_time: settings.dailyStartTime,
        daily_end_time: settings.dailyEndTime,
        friday_start_time: settings.fridayStartTime || null,
        friday_end_time: settings.fridayEndTime || null,
        break_duration_minutes: settings.breakDurationMinutes || null,
        work_days: settings.workDays,
        overtime_threshold_hours: settings.overtimeThresholdHours || null,
      };

      const { data, error } = await supabase
        .from('work_hours_settings')
        .upsert(payload, { onConflict: 'user_id' }) // Upsert based on user_id
        .select()
        .single();

      if (error) {
        console.error("useWorkHoursSettings: Error upserting live settings:", error);
        showError(`Failed to save work hours settings: ${error.message}`);
        return null;
      } else if (data) {
        const camelCaseData: WorkHoursSettings = {
          id: data.id,
          userId: data.user_id,
          dailyStartTime: data.daily_start_time,
          dailyEndTime: data.daily_end_time,
          fridayStartTime: data.friday_start_time || undefined,
          fridayEndTime: data.friday_end_time || undefined,
          breakDurationMinutes: data.break_duration_minutes || undefined,
          workDays: data.work_days || [],
          overtimeThresholdHours: data.overtime_threshold_hours || undefined,
        };
        setWorkHoursSettings(camelCaseData);
        showSuccess("Work hours settings saved successfully!");
        return camelCaseData;
      }
      return null;
    } catch (err) {
      console.error("useWorkHoursSettings: Unhandled error upserting live settings:", err);
      showError("An unexpected error occurred while saving work hours settings.");
      return null;
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
        setWorkHoursSettings(JSON.parse(storedSettings));
      } else {
        setWorkHoursSettings(null); // No mock settings saved yet
      }
      setIsLoading(false);
    } else if (isAuthenticated) {
      fetchLiveSettings();
    } else {
      setWorkHoursSettings(null);
      setIsLoading(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveSettings]);

  const saveSettings = useCallback(async (settings: Omit<WorkHoursSettings, 'id' | 'userId'> & { id?: string }) => {
    if (isMockDataEnabled) {
      const mockSettings: WorkHoursSettings = {
        ...settings,
        userId: user?.id || 'mock-user', // Assign a mock user ID
        id: settings.id || 'mock-id',
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockSettings));
      setWorkHoursSettings(mockSettings);
      showSuccess("Work hours settings saved locally (mock data)!");
      return mockSettings;
    } else {
      return await upsertLiveSettings({ ...settings, userId: user!.id });
    }
  }, [isMockDataEnabled, user, upsertLiveSettings]);

  return {
    workHoursSettings,
    isLoadingWorkHoursSettings: isLoading,
    saveWorkHoursSettings: saveSettings,
    refetchWorkHoursSettings: fetchLiveSettings,
  };
};