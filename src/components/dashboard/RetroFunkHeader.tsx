"use client";

import React from "react";
import DashboardVisibilityDropdown from "@/components/dashboard/DashboardVisibilityDropdown";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { Sparkles } from "lucide-react";

const RetroFunkHeader: React.FC = () => {
  const { companyDetails, isMockDataEnabled } = usePayrollProcessor();
  const companyLegalName =
    companyDetails?.companyLegalName ||
    companyDetails?.companyTradingName ||
    "Your Company Name";

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-r from-sky-300 via-indigo-400 to-fuchsia-500 text-white">
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="rounded-xl bg-white/20 p-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              <span className="text-white/80 mr-2">{companyLegalName}</span>
              Payroll Dashboard
            </h1>
            <p className="text-white/85 text-sm">
              A fresher, retro-funk perspective for insights and actions
            </p>
          </div>
        </div>

        <div className="self-start md:self-auto">
          <DashboardVisibilityDropdown isMockDataEnabled={isMockDataEnabled} />
        </div>
      </div>
    </div>
  );
};

export default RetroFunkHeader;