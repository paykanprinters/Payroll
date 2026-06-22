"use client";

import React from "react";
import { LayoutDashboard } from "lucide-react";
import DashboardVisibilityDropdown from "@/components/dashboard/DashboardVisibilityDropdown";
import DashboardLayoutDialog from "@/components/dashboard/DashboardLayoutDialog";
import {
  DashboardWidgetKey,
  DashboardWidgetSection,
  DashboardWidgetVisibility,
} from "@/hooks/use-dashboard-settings";

interface RetroFunkHeaderProps {
  companyLegalName: string;
  isMockDataEnabled: boolean;
  visibleWidgets: DashboardWidgetVisibility | null;
  isLoadingSettings: boolean;
  getSectionOrder: (section: DashboardWidgetSection) => DashboardWidgetKey[];
  moveWidget: (key: DashboardWidgetKey, section: DashboardWidgetSection, toIndex: number) => void;
  toggleWidgetVisibility: (key: DashboardWidgetKey) => void;
  resetToDefaults: () => void | Promise<void>;
}

const RetroFunkHeader: React.FC<RetroFunkHeaderProps> = ({
  companyLegalName,
  isMockDataEnabled,
  visibleWidgets,
  isLoadingSettings,
  getSectionOrder,
  moveWidget,
  toggleWidgetVisibility,
  resetToDefaults,
}) => {
  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/70">{companyLegalName}</p>
            <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">Dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Operational overview for payroll readiness, tasks, and workforce trends.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isLoadingSettings && visibleWidgets && (
            <DashboardLayoutDialog
              order={getSectionOrder}
              visible={(k) => !!visibleWidgets[k]}
              onMove={moveWidget}
            />
          )}
          <DashboardVisibilityDropdown
            isMockDataEnabled={isMockDataEnabled}
            visibleWidgets={visibleWidgets}
            isLoadingSettings={isLoadingSettings}
            toggleWidgetVisibility={toggleWidgetVisibility}
            resetToDefaults={resetToDefaults}
            onBanner
          />
        </div>
      </div>
    </div>
  );
};

export default RetroFunkHeader;
