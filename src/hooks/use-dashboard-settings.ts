"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { showError } from "@/utils/toast";

export interface DashboardWidgetVisibility {
  summaryCards: boolean;
  upcomingPayrollCard: boolean;
  toDoListCard: boolean;
  monthlyPayrollOverviewChart: boolean;
  currentDateCalendar: boolean;
  employeeJobTitleDistributionChart: boolean;
  totalDeductionsBreakdownChart: boolean;
  averageNetPayTrendChart: boolean;
  employeeSalaryDistributionChart: boolean;
  monthlyLeaveDaysTakenChart: boolean;
  quickActionsCard: boolean;
}

// Define default visibility settings based on user roles
const DEFAULT_WIDGET_VISIBILITY_BY_ROLE: Record<string, DashboardWidgetVisibility> = {
  Admin: {
    summaryCards: true,
    upcomingPayrollCard: true,
    toDoListCard: true,
    monthlyPayrollOverviewChart: true,
    currentDateCalendar: true,
    employeeJobTitleDistributionChart: true,
    totalDeductionsBreakdownChart: true,
    averageNetPayTrendChart: true,
    employeeSalaryDistributionChart: true,
    monthlyLeaveDaysTakenChart: true,
    quickActionsCard: true,
  },
  Manager: {
    summaryCards: true,
    upcomingPayrollCard: true,
    toDoListCard: true,
    monthlyPayrollOverviewChart: true,
    currentDateCalendar: true,
    employeeJobTitleDistributionChart: true,
    totalDeductionsBreakdownChart: true,
    averageNetPayTrendChart: true,
    employeeSalaryDistributionChart: false, // Managers might not need detailed salary distribution
    monthlyLeaveDaysTakenChart: true,
    quickActionsCard: true,
  },
  Staff: {
    summaryCards: true,
    upcomingPayrollCard: true,
    toDoListCard: true,
    monthlyPayrollOverviewChart: false,
    currentDateCalendar: true,
    employeeJobTitleDistributionChart: false,
    totalDeductionsBreakdownChart: false,
    averageNetPayTrendChart: false,
    employeeSalaryDistributionChart: false,
    monthlyLeaveDaysTakenChart: false,
    quickActionsCard: false, // Staff might not need quick actions for payroll
  },
  Viewer: {
    summaryCards: true,
    upcomingPayrollCard: true,
    toDoListCard: true,
    monthlyPayrollOverviewChart: true,
    currentDateCalendar: true,
    employeeJobTitleDistributionChart: true,
    totalDeductionsBreakdownChart: true,
    averageNetPayTrendChart: true,
    employeeSalaryDistributionChart: true,
    monthlyLeaveDaysTakenChart: true,
    quickActionsCard: false,
  },
};

const LOCAL_STORAGE_KEY = "dashboardWidgetVisibility";

interface UseDashboardSettingsProps {
  isMockDataEnabled: boolean;
}

export const useDashboardSettings = ({ isMockDataEnabled }: UseDashboardSettingsProps) => {
  const { user, isLoadingAuth } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgetVisibility | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const getRoleBasedDefaults = useCallback(() => {
    const role = user?.role || "Staff"; // Default to 'Staff' if no user or role
    return DEFAULT_WIDGET_VISIBILITY_BY_ROLE[role] || DEFAULT_WIDGET_VISIBILITY_BY_ROLE.Staff;
  }, [user]);

  const fetchLiveSettings = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('user_dashboard_settings')
        .select('widget_key, is_visible')
        .eq('user_id', user.id);

      if (error) {
        console.error("useDashboardSettings: Error fetching live settings:", error);
        showError("Failed to load dashboard settings.");
        // Fallback to defaults on error, ensure comparison
        const defaults = getRoleBasedDefaults();
        if (JSON.stringify(defaults) !== JSON.stringify(visibleWidgets)) {
          setVisibleWidgets(defaults);
        }
      } else {
        const defaults = getRoleBasedDefaults();
        const userSettings: Partial<DashboardWidgetVisibility> = {};
        data.forEach(setting => {
          (userSettings as any)[setting.widget_key] = setting.is_visible;
        });
        const mergedSettings = { ...defaults, ...userSettings };
        console.log("useDashboardSettings: Loaded from Supabase (merged):", mergedSettings);
        // Only update state if the new settings are actually different
        if (JSON.stringify(mergedSettings) !== JSON.stringify(visibleWidgets)) {
          setVisibleWidgets(mergedSettings);
        }
      }
    } catch (e) {
      console.error("useDashboardSettings: Unhandled error fetching live settings:", e);
      showError("An unexpected error occurred while loading dashboard settings.");
      const defaults = getRoleBasedDefaults();
      if (JSON.stringify(defaults) !== JSON.stringify(visibleWidgets)) {
        setVisibleWidgets(defaults);
      }
    } finally {
      setIsLoadingSettings(false);
    }
  }, [user, getRoleBasedDefaults, visibleWidgets]);

  // NEW: Define saveLiveSetting
  const saveLiveSetting = useCallback(async (widgetKey: keyof DashboardWidgetVisibility, isVisible: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_dashboard_settings')
        .upsert(
          {
            user_id: user.id,
            widget_key: widgetKey,
            is_visible: isVisible,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, widget_key' } // Upsert based on user_id and widget_key
        );

      if (error) {
        console.error("useDashboardSettings: Error saving live setting:", error);
        showError("Failed to save dashboard setting.");
      } else {
        console.log("useDashboardSettings: Saved live setting:", widgetKey, isVisible);
      }
    } catch (e) {
      console.error("useDashboardSettings: Unhandled error saving live setting:", e);
      showError("An unexpected error occurred while saving dashboard setting.");
    }
  }, [user]); // Dependency: user

  // Load settings from localStorage or Supabase on mount/auth/mockData change
  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingSettings(true); // Keep loading true while auth is loading
      return;
    }

    if (isMockDataEnabled) {
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
      const defaults = getRoleBasedDefaults();
      let newSettings: DashboardWidgetVisibility;

      if (savedSettings) {
        try {
          const parsedSettings: DashboardWidgetVisibility = JSON.parse(savedSettings);
          newSettings = { ...defaults, ...parsedSettings };
          console.log("useDashboardSettings: Loaded from localStorage (merged):", newSettings);
        } catch (e) {
          console.error("useDashboardSettings: Failed to parse dashboard settings from localStorage, using defaults.", e);
          newSettings = defaults;
        }
      } else {
        console.log("useDashboardSettings: No settings in localStorage, using defaults:", defaults);
        newSettings = defaults;
      }

      // Deep comparison to prevent infinite re-renders if content is the same
      if (JSON.stringify(newSettings) !== JSON.stringify(visibleWidgets)) {
        setVisibleWidgets(newSettings);
      }
      setIsLoadingSettings(false);
    } else {
      fetchLiveSettings();
    }
  }, [isLoadingAuth, user, isMockDataEnabled, getRoleBasedDefaults, fetchLiveSettings, visibleWidgets]);

  // Save settings to localStorage (for mock data) or Supabase (for live data) whenever they change
  useEffect(() => {
    if (visibleWidgets && !isLoadingSettings) { // Only save if not currently loading and widgets are defined
      if (isMockDataEnabled) {
        console.log("useDashboardSettings: Saving to localStorage:", visibleWidgets);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(visibleWidgets));
      }
      // Live data saving is handled by saveLiveSetting in toggleWidgetVisibility and resetToDefaults
    }
  }, [visibleWidgets, isMockDataEnabled, isLoadingSettings]);

  const toggleWidgetVisibility = useCallback((widgetKey: keyof DashboardWidgetVisibility) => {
    setVisibleWidgets(prev => {
      if (!prev) return null;
      const newState = {
        ...prev,
        [widgetKey]: !prev[widgetKey],
      };
      console.log("useDashboardSettings: Toggling widget. New state for", widgetKey, ":", newState[widgetKey], "Full new state:", newState);
      if (!isMockDataEnabled) {
        saveLiveSetting(widgetKey, newState[widgetKey]); // This call will now work
      }
      return newState;
    });
  }, [isMockDataEnabled, saveLiveSetting]); // saveLiveSetting is correctly in dependencies

  const resetToDefaults = useCallback(async () => {
    const defaults = getRoleBasedDefaults();
    // Only update if defaults are different from current state
    if (JSON.stringify(defaults) !== JSON.stringify(visibleWidgets)) {
      setVisibleWidgets(defaults);
    }
    
    if (isMockDataEnabled) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults)); // Explicitly save defaults
      console.log("useDashboardSettings: Resetting to defaults (mock):", defaults);
    } else {
      // Delete all existing settings for the user to effectively reset to defaults
      if (user?.id) {
        setIsLoadingSettings(true);
        try {
          const { error } = await supabase
            .from('user_dashboard_settings')
            .delete()
            .eq('user_id', user.id);

          if (error) {
            console.error("useDashboardSettings: Error resetting live settings:", error);
            showError("Failed to reset dashboard settings.");
          } else {
            console.log("useDashboardSettings: Reset live settings by deleting user's entries.");
            // After deleting, re-fetch to ensure the UI reflects the defaults
            fetchLiveSettings();
          }
        } catch (e) {
          console.error("useDashboardSettings: Unhandled error resetting live settings:", e);
          showError("An unexpected error occurred while resetting dashboard settings.");
        } finally {
          setIsLoadingSettings(false);
        }
      }
    }
  }, [getRoleBasedDefaults, isMockDataEnabled, user, fetchLiveSettings, visibleWidgets]);

  return {
    visibleWidgets,
    toggleWidgetVisibility,
    resetToDefaults,
    isLoadingSettings: isLoadingSettings || visibleWidgets === null, // Ensure loading state is accurate
  };
};