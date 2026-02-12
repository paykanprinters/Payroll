"use client";

import React from "react";
import { Loader2 } from "lucide-react";

import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";

const Dashboard: React.FC = () => {
  const { employees, payslips, isLoadingCompanyDetails, isLoadingEmployees, isLoadingPayCycleSettings } = usePayrollProcessor();

  const isLoadingPage = isLoadingCompanyDetails || isLoadingEmployees || isLoadingPayCycleSettings;

  if (isLoadingPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardSummaryCards employeeCount={employees.length} recentPayslipCount={payslips.length} />
    </div>
  );
};

export default Dashboard;