"use client";

import React from "react";
import DashboardVisibilityDropdown from "@/components/dashboard/DashboardVisibilityDropdown";
import DashboardLayoutDialog from "@/components/dashboard/DashboardLayoutDialog";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { ShieldCheck } from "lucide-react";
import { useDashboardSettings } from "@/hooks/use-dashboard-settings";

const RetroFunkHeader: React.FC = () => {
  const { companyDetails, isMockDataEnabled } = usePayrollProcessor();
  const { visibleWidgets, getSectionOrder, moveWidget, isLoadingSettings } = useDashboardSettings({
    isMockDataEnabled,
  });

  const companyLegalName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company";

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-[#0B253A] p-8 text-white shadow-xl">
      {/* subtle texture */}
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(122,186,72,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/10 p-3">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white/70">{companyLegalName}</div>
            <h1 className="mt-1 text-3xl font-semibold -tracking-tight md:text-4xl">Payroll Dashboard</h1>
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
          <DashboardVisibilityDropdown isMockDataEnabled={isMockDataEnabled} />
        </div>
      </div>
    </div>
  );
};

export default RetroFunkHeader;