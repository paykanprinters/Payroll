"use client";

import React from "react";
import { ReceiptText, Sparkles } from "lucide-react";

const PayslipsHeader: React.FC = () => {
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
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Payslip Overview</h1>
            <p className="text-sm text-white/75">Generate, review, and export payslips.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-5 w-5 text-white/80" />
          <span className="text-white/75">Quick insights and streamlined actions</span>
        </div>
      </div>
    </div>
  );
};

export default PayslipsHeader;