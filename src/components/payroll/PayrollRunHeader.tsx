"use client";

import React from "react";
import { ReceiptText, Sparkles } from "lucide-react";

type PayrollRunHeaderProps = {
  title?: string;
  subtitle?: string;
};

const PayrollRunHeader: React.FC<PayrollRunHeaderProps> = ({
  title = "Payroll Run",
  subtitle = "Review readiness, generate items, and complete approvals with a clean audit trail.",
}) => {
  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <ReceiptText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">{title}</h1>
            <p className="text-sm text-white/75">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-5 w-5 text-white/80" />
          <span className="text-white/75">Governance-first payroll processing</span>
        </div>
      </div>
    </div>
  );
};

export default PayrollRunHeader;
