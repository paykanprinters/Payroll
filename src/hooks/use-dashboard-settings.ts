"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

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

export const useDashboardSettings = () => {
  const { user, isLoadingAuth } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgetVisibility | null>(null);

  const getRoleBasedDefaults = useCallback(() => {
    const role = user?.role || "Staff"; // Default to 'Staff' if no user or role
    return DEFAULT_WIDGET_VISIBILITY_BY_ROLE[role] || DEFAULT_WIDGET_VISIBILITY_BY_ROLE.Staff;
  }, [user]);

  // Load settings from localStorage or apply defaults
  useEffect(() => {
    if (isLoadingAuth || !user) return; // Wait for auth to load

    const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
    const defaults = getRoleBasedDefaults();

    if (savedSettings) {
      try {
        const parsedSettings: DashboardWidgetVisibility = JSON.parse(savedSettings);
        // Merge with defaults to ensure all new widgets are included
        setVisibleWidgets({ ...defaults, ...parsedSettings });
      } catch (e) {
        console.error("Failed to parse dashboard settings from localStorage, using defaults.", e);
        setVisibleWidgets(defaults);
      }
    } else {
      setVisibleWidgets(defaults);
    }
  }, [isLoadingAuth, user, getRoleBasedDefaults]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (visibleWidgets) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(visibleWidgets));
    }
  }, [visibleWidgets]);

  const toggleWidgetVisibility = useCallback((widgetKey: keyof DashboardWidgetVisibility) => {
    setVisibleWidgets(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [widgetKey]: !prev[widgetKey],
      };
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = getRoleBasedDefaults();
    setVisibleWidgets(defaults);
  }, [getRoleBasedDefaults]);

  return {
    visibleWidgets,
    toggleWidgetVisibility,
    resetToDefaults,
    isLoadingSettings: isLoadingAuth || visibleWidgets === null,
  };
};