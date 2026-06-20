"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

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
  // Pass the dashboard settings instance down from the Dashboard page so actions immediately affect the widgets.
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
    <div className="kan-page-banner p-8 shadow-xl">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/10 p-3">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white/70">{companyLegalName}</div>
            <h1 className="mt-1 text-3xl font-semibold -tracking-tight text-white md:text-4xl">Payroll Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
              Review key metrics, run payroll, and keep an auditable trail—built for scale.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
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