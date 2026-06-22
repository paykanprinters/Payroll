"use client";

import React from "react";
import { ListTodo, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePayrollProcessor } from "@/context/PayrollDataContext";

interface ToDosHeaderProps {
  onGenerate: () => void;
  generateDisabled: boolean;
  generateTitle?: string;
  isGenerating?: boolean;
}

const ToDosHeader: React.FC<ToDosHeaderProps> = ({
  onGenerate,
  generateDisabled,
  generateTitle,
  isGenerating = false,
}) => {
  const { companyDetails } = usePayrollProcessor();
  const companyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company";

  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <ListTodo className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/70">{companyName}</p>
            <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">Payroll To-Dos</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              Action items from employee records, timesheets, leave, and payroll readiness checks.
            </p>
          </div>
        </div>

        <Button
          onClick={onGenerate}
          disabled={generateDisabled || isGenerating}
          title={generateTitle}
          className="bg-white text-cyan-900 hover:bg-white/90"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate to-dos
        </Button>
      </div>
    </div>
  );
};

export default ToDosHeader;
