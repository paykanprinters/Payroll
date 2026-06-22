"use client";

import React from "react";
import { LayoutDashboard } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";
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
    <KanPageBanner
      icon={LayoutDashboard}
      companyName={companyLegalName}
      title="Dashboard"
      description="Operational overview for payroll readiness, tasks, and workforce trends."
      actions={
        <>
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
        </>
      }
    />
  );
};

export default RetroFunkHeader;
