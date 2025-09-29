"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IndividualPayslipCard from "./IndividualPayslipCard";
import { MockEmployee } from "@/lib/mock-data"; // Import MockEmployee interface

interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
  leaveSummary: { annual: number; sick: number; unpaid: number };
}

interface PayslipDesignSettings {
  showCompanyLogo?: boolean;
  showCompanyDetails?: boolean;
  showEmployeeDetails?: boolean;
  showEarningsBreakdown?: boolean;
  showDeductionsBreakdown?: boolean;
  showLeaveSummary?: boolean;
  showBankDetails?: boolean;
  sectionOrder?: ("Earnings" | "Deductions" | "Leave")[];
  layoutSize?: "Letter" | "A4" | "A5"; // Layout size setting
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right"; // New layout setting
}

interface PayslipsListProps {
  payslips: MockPayslip[];
  payslipDesignSettings: PayslipDesignSettings;
  companyTradingName: string;
  companyLogoUrl: string | null;
  companyLogoSize: number;
  employees: MockEmployee[]; // Add employees prop
  getEmployeeName: (employeeId: string) => string;
}

const PayslipsList: React.FC<PayslipsListProps> = ({
  payslips,
  payslipDesignSettings,
  companyTradingName,
  companyLogoUrl,
  companyLogoSize,
  employees, // Destructure employees
  getEmployeeName,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Payslips</CardTitle>
      </CardHeader>
      <CardContent>
        {payslips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payslips.map((payslip) => (
              <IndividualPayslipCard
                key={payslip.id}
                payslip={payslip}
                payslipDesignSettings={payslipDesignSettings}
                companyTradingName={companyTradingName}
                companyLogoUrl={companyLogoUrl}
                companyLogoSize={companyLogoSize}
                employees={employees} // Pass employees down
                getEmployeeName={getEmployeeName}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No payslip data available. Please enable mock data in settings or generate payslips.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayslipsList;