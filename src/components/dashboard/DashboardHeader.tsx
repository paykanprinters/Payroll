"use client";

import React from "react";
import DashboardVisibilityDropdown from "@/components/dashboard/DashboardVisibilityDropdown";
import { usePayrollProcessor } from "@/context/PayrollDataContext";

const DashboardHeader: React.FC = () => {
  const { companyDetails, isMockDataEnabled } = usePayrollProcessor();
  const companyLegalName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";

  return (
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold">
        {companyLegalName && <span className="text-muted-foreground mr-2">{companyLegalName}</span>}
        Payroll Dashboard
      </h1>
      <DashboardVisibilityDropdown isMockDataEnabled={isMockDataEnabled} />
    </div>
  );
};

export default DashboardHeader;