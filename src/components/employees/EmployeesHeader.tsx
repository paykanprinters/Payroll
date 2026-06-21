"use client";

import React from "react";
import { Users, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePayrollProcessor } from "@/context/PayrollDataContext";

interface EmployeesHeaderProps {
  onAddEmployee?: () => void;
  isMutating?: boolean;
}

const EmployeesHeader: React.FC<EmployeesHeaderProps> = ({ onAddEmployee, isMutating = false }) => {
  const { companyDetails } = usePayrollProcessor();
  const companyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";

  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">
              <span className="mr-2 text-white/70">{companyName}</span>
              Employees
            </h1>
            <p className="text-sm text-white/75">
              Maintain complete employee records for payroll, timesheets, and the staff portal.
            </p>
          </div>
        </div>

        {onAddEmployee && (
          <Button
            onClick={onAddEmployee}
            disabled={isMutating}
            className="bg-white text-cyan-900 hover:bg-white/90"
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Add employee
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmployeesHeader;
