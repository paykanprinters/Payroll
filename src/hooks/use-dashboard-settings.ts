"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  payrollRunCard: boolean;
  // Cross-module insights
  timesheetStatusChart: boolean;
  savingsStatusChart: boolean;
  loansOverviewCard: boolean;
}

export type DashboardWidgetKey = keyof DashboardWidgetVisibility;
export type DashboardWidgetSection = "main" | "side" | "charts";

export interface DashboardWidgetLayoutItem {
  key: DashboardWidgetKey;
  section: DashboardWidgetSection;
  position: number;
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
    payrollRunCard: true,
    timesheetStatusChart: true,
    savingsStatusChart: true,
    loansOverviewCard: true,
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
    employeeSalaryDistributionChart: false,
    monthlyLeaveDaysTakenChart: true,
    quickActionsCard: true,
    payrollRunCard: true,
    timesheetStatusChart: true,
    savingsStatusChart: true,
    loansOverviewCard: true,
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
    quickActionsCard: false,
    payrollRunCard: false,
    timesheetStatusChart: true,
    savingsStatusChart: true,
    loansOverviewCard: true,
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
    payrollRunCard: false,
    timesheetStatusChart: true,
    savingsStatusChart: true,
    loansOverviewCard: true,
  },
};

const LOCAL_STORAGE_KEY = "dashboardWidgetVisibility";
const LOCAL_LAYOUT_KEY = "dashboardWidgetLayout";

interface UseDashboardSettingsProps {
  isMockDataEnabled: boolean;
}

export const useDashboardSettings = ({ isMockDataEnabled }: UseDashboardSettingsProps) => {
  const { user, isLoadingAuth } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgetVisibility | null>(null);
  const [layout, setLayout] = useState<DashboardWidgetLayoutItem[] | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const getRoleBasedDefaults = useCallback(() => {
    const role = user?.role || "Staff";
    return DEFAULT_WIDGET_VISIBILITY_BY_ROLE[role] || DEFAULT_WIDGET_VISIBILITY_BY_ROLE.Staff;
  }, [user]);

  const defaultLayout = useMemo<DashboardWidgetLayoutItem[]>(() => {
    // Default ordering matches the current dashboard layout.
    const main: DashboardWidgetKey[] = ["toDoListCard", "timesheetStatusChart", "loansOverviewCard"];
    const side: DashboardWidgetKey[] = ["payrollRunCard", "savingsStatusChart", "currentDateCalendar"];
    const charts: DashboardWidgetKey[] = [
      "monthlyPayrollOverviewChart",
      "averageNetPayTrendChart",
      "totalDeductionsBreakdownChart",
      "employeeJobTitleDistributionChart",
      "employeeSalaryDistributionChart",
      "monthlyLeaveDaysTakenChart",
    ];

    return [
      ...main.map((key, idx) => ({ key, section: "main" as const, position: idx })),
      ...side.map((key, idx) => ({ key, section: "side" as const, position: idx })),
      ...charts.map((key, idx) => ({ key, section: "charts" as const, position: idx })),
    ];
  }, []);

  const normalizeLayout = useCallback(
    (incoming: DashboardWidgetLayoutItem[] | null | undefined) => {
      const base = new Map<DashboardWidgetKey, DashboardWidgetLayoutItem>();
      defaultLayout.forEach((i) => base.set(i.key, i));

      (incoming || []).forEach((i) => {
        if (!i?.key) return;
        const key = i.key as DashboardWidgetKey;
        if (!base.has(key)) return;
        base.set(key, {
          key,
          section: (i.section as DashboardWidgetSection) || base.get(key)!.section,
          position: typeof i.position === "number" ? i.position : base.get(key)!.position,
        });
      });

      const items = Array.from(base.values());
      const bySection: Record<DashboardWidgetSection, DashboardWidgetLayoutItem[]> = {
        main: [],
        side: [],
        charts: [],
      };
      items.forEach((i) => bySection[i.section].push(i));

      (Object.keys(bySection) as DashboardWidgetSection[]).forEach((s) => {
        bySection[s]
          .sort((a, b) => a.position - b.position)
          .forEach((i, idx) => {
            i.position = idx;
          });
      });

      return [...bySection.main, ...bySection.side, ...bySection.charts];
    },
    [defaultLayout]
  );

  const fetchLiveSettings = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("user_dashboard_settings")
        .select("widget_key, is_visible, section, position")
        .eq("user_id", user.id);

      if (error) {
        console.error("useDashboardSettings: Error fetching live settings:", error);
        showError("Failed to load dashboard settings.");
        const defaults = getRoleBasedDefaults();
        setVisibleWidgets(defaults);
        setLayout(defaultLayout);
        return;
      }

      const defaults = getRoleBasedDefaults();
      const userSettings: Partial<DashboardWidgetVisibility> = {};
      const incomingLayout: DashboardWidgetLayoutItem[] = [];

      data.forEach((setting) => {
        const key = setting.widget_key as DashboardWidgetKey;
        if (key in defaults) {
          userSettings[key] = setting.is_visible;
        }
        if (typeof setting.section === "string" && typeof setting.position === "number") {
          incomingLayout.push({
            key,
            section: setting.section as DashboardWidgetSection,
            position: setting.position as number,
          });
        }
      });

      setVisibleWidgets({ ...defaults, ...userSettings });
      setLayout(normalizeLayout(incomingLayout));
    } catch (e) {
      console.error("useDashboardSettings: Unhandled error fetching live settings:", e);
      showError("An unexpected error occurred while loading dashboard settings.");
      setVisibleWidgets(getRoleBasedDefaults());
      setLayout(defaultLayout);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [defaultLayout, getRoleBasedDefaults, normalizeLayout, user?.id]);

  const saveLiveVisibility = useCallback(
    async (widgetKey: DashboardWidgetKey, isVisible: boolean) => {
      if (!user?.id) return;

      try {
        const { error } = await supabase.from("user_dashboard_settings").upsert(
          {
            user_id: user.id,
            widget_key: widgetKey,
            is_visible: isVisible,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id, widget_key" }
        );

        if (error) {
          console.error("useDashboardSettings: Error saving live setting:", error);
          showError("Failed to save dashboard setting.");
        }
      } catch (e) {
        console.error("useDashboardSettings: Unhandled error saving live setting:", e);
        showError("An unexpected error occurred while saving dashboard setting.");
      }
    },
    [user?.id]
  );

  const persistLiveLayout = useCallback(
    async (nextLayout: DashboardWidgetLayoutItem[]) => {
      if (!user?.id) return;

      // Upsert all items (small set) to keep logic simple.
      const rows = nextLayout.map((i) => ({
        user_id: user.id,
        widget_key: i.key,
        section: i.section,
        position: i.position,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("user_dashboard_settings").upsert(rows, {
        onConflict: "user_id, widget_key",
      });

      if (error) {
        console.error("useDashboardSettings: Error saving layout:", error);
        showError("Failed to save dashboard layout.");
      }
    },
    [user?.id]
  );

  // Load settings from localStorage or Supabase on mount/auth/mockData change
  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingSettings(true);
      return;
    }

    if (isMockDataEnabled) {
      const defaults = getRoleBasedDefaults();
      const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
      const savedLayout = localStorage.getItem(LOCAL_LAYOUT_KEY);

      let nextVisible = defaults;
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings) as DashboardWidgetVisibility;
          nextVisible = { ...defaults, ...parsed };
        } catch {
          nextVisible = defaults;
        }
      }

      let nextLayout = defaultLayout;
      if (savedLayout) {
        try {
          const parsedLayout = JSON.parse(savedLayout) as DashboardWidgetLayoutItem[];
          nextLayout = normalizeLayout(parsedLayout);
        } catch {
          nextLayout = defaultLayout;
        }
      }

      setVisibleWidgets(nextVisible);
      setLayout(nextLayout);
      setIsLoadingSettings(false);
    } else {
      fetchLiveSettings();
    }
  }, [defaultLayout, fetchLiveSettings, getRoleBasedDefaults, isLoadingAuth, isMockDataEnabled, normalizeLayout]);

  // Save to localStorage (mock mode)
  useEffect(() => {
    if (!isMockDataEnabled) return;
    if (!visibleWidgets || !layout || isLoadingSettings) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(visibleWidgets));
    localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(layout));
  }, [isLoadingSettings, isMockDataEnabled, layout, visibleWidgets]);

  const toggleWidgetVisibility = useCallback(
    (widgetKey: DashboardWidgetKey) => {
      setVisibleWidgets((prev) => {
        if (!prev) return null;
        const next = { ...prev, [widgetKey]: !prev[widgetKey] };
        if (!isMockDataEnabled) {
          saveLiveVisibility(widgetKey, next[widgetKey]);
        }
        return next;
      });
    },
    [isMockDataEnabled, saveLiveVisibility]
  );

  const moveWidget = useCallback(
    (key: DashboardWidgetKey, section: DashboardWidgetSection, toIndex: number) => {
      setLayout((prev) => {
        const current = normalizeLayout(prev);
        const item = current.find((x) => x.key === key);
        if (!item) return current;

        // Remove from current section
        const bySection: Record<DashboardWidgetSection, DashboardWidgetLayoutItem[]> = {
          main: [],
          side: [],
          charts: [],
        };
        current.forEach((x) => {
          if (x.key === key) return;
          bySection[x.section].push({ ...x });
        });

        const nextItem: DashboardWidgetLayoutItem = { key, section, position: 0 };
        const arr = bySection[section];
        const safeIndex = Math.max(0, Math.min(arr.length, toIndex));
        arr.splice(safeIndex, 0, nextItem);

        // Re-index positions
        (Object.keys(bySection) as DashboardWidgetSection[]).forEach((s) => {
          bySection[s].forEach((x, idx) => (x.position = idx));
        });

        const nextLayout = [...bySection.main, ...bySection.side, ...bySection.charts];

        if (isMockDataEnabled) {
          localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(nextLayout));
        } else {
          persistLiveLayout(nextLayout);
        }

        return nextLayout;
      });
    },
    [isMockDataEnabled, normalizeLayout, persistLiveLayout]
  );

  const resetToDefaults = useCallback(async () => {
    const defaults = getRoleBasedDefaults();
    setVisibleWidgets(defaults);
    setLayout(defaultLayout);

    if (isMockDataEnabled) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaults));
      localStorage.setItem(LOCAL_LAYOUT_KEY, JSON.stringify(defaultLayout));
      return;
    }

    if (!user?.id) return;

    setIsLoadingSettings(true);
    try {
      const { error } = await supabase.from("user_dashboard_settings").delete().eq("user_id", user.id);
      if (error) {
        console.error("useDashboardSettings: Error resetting live settings:", error);
        showError("Failed to reset dashboard settings.");
      } else {
        // Recreate layout rows (keep visibility defaults implicit by not writing is_visible rows here)
        await persistLiveLayout(defaultLayout);
      }
    } catch (e) {
      console.error("useDashboardSettings: Unhandled error resetting live settings:", e);
      showError("An unexpected error occurred while resetting dashboard settings.");
    } finally {
      setIsLoadingSettings(false);
    }
  }, [defaultLayout, getRoleBasedDefaults, isMockDataEnabled, persistLiveLayout, user?.id]);

  const getSectionOrder = useCallback(
    (section: DashboardWidgetSection) => {
      const current = normalizeLayout(layout);
      return current
        .filter((x) => x.section === section)
        .sort((a, b) => a.position - b.position)
        .map((x) => x.key);
    },
    [layout, normalizeLayout]
  );

  return {
    visibleWidgets,
    layout,
    toggleWidgetVisibility,
    moveWidget,
    getSectionOrder,
    resetToDefaults,
    isLoadingSettings: isLoadingSettings || visibleWidgets === null || layout === null,
  };
};