"use client";

import React from "react";
import { Users, Sparkles } from "lucide-react";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

const EmployeesHeader: React.FC = () => {
  const { companyDetails } = usePayrollProcessor();
  const companyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B253A] p-6 text-white md:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(122,186,72,0.22),transparent_55%)]" />
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#7ABA48]/15 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">
              <span className="mr-2 text-white/70">{companyName}</span>
              Employees
            </h1>
            <p className="text-sm text-white/75">Manage people, roles, and payroll-ready employee data.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-5 w-5 text-white/80" />
          <span className="text-white/75">Add, edit, and explore employee data</span>
        </div>
      </div>
    </div>
  );
};

export default EmployeesHeader;