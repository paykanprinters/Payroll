"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

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
}

interface IndividualPayslipCardProps {
  payslip: MockPayslip;
  payslipDesignSettings: PayslipDesignSettings;
  companyTradingName: string;
  companyLogoUrl: string | null;
  companyLogoSize: number;
  getEmployeeName: (employeeId: string) => string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const IndividualPayslipCard: React.FC<IndividualPayslipCardProps> = ({
  payslip,
  payslipDesignSettings,
  companyTradingName,
  companyLogoUrl,
  companyLogoSize,
  getEmployeeName,
}) => {
  const renderSection = (sectionName: string) => {
    const settings = payslipDesignSettings;
    switch (sectionName) {
      case "Earnings":
        return settings.showEarningsBreakdown && (
          <div key="earnings" className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Earnings</h4>
            {payslip.earningsBreakdown.map((item, idx) => (
              <p key={idx} className="text-xs">{item.name}: R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            ))}
            <p className="text-xs font-semibold mt-1">Gross Earnings: R {payslip.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          </div>
        );
      case "Deductions":
        return settings.showDeductionsBreakdown && (
          <div key="deductions" className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Deductions</h4>
            {payslip.deductionsBreakdown.map((item, idx) => (
              <p key={idx} className="text-xs">{item.name}: R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            ))}
            <p className="text-xs font-semibold mt-1">Total Deductions: R {payslip.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          </div>
        );
      case "Leave":
        return settings.showLeaveSummary && (
          <div key="leave" className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Leave Summary</h4>
            <p className="text-xs">Annual Leave Remaining: {payslip.leaveSummary.annual} days</p>
            <p className="text-xs">Sick Leave Remaining: {payslip.leaveSummary.sick} days</p>
            {payslip.leaveSummary.unpaid > 0 && (
              <p className="text-xs">Unpaid Leave Taken: {payslip.leaveSummary.unpaid} days</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div id={`payslip-${payslip.id}`} className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <h3 className="text-lg font-bold mb-3 text-center">Payslip</h3>
      <div className="border p-4 rounded-md space-y-3 text-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          {payslipDesignSettings.showCompanyLogo && companyLogoUrl && (
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
              className="rounded-md"
            />
          )}
          <div className={cn("text-right", !payslipDesignSettings.showCompanyLogo && "w-full")}>
            <h2 className="text-md font-bold">{companyTradingName}</h2>
            {payslipDesignSettings.showCompanyDetails && (
              <>
                <p className="text-xs">123 Corporate Ave, Business City, 1234</p>
                <p className="text-xs">Reg. No: 2023/123456/07</p>
                <p className="text-xs">Tax No: 9876543210</p>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Employee Details */}
        {payslipDesignSettings.showEmployeeDetails && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p><span className="font-semibold">Employee Name:</span> {getEmployeeName(payslip.employeeId)}</p>
              <p><span className="font-semibold">Employee ID:</span> {payslip.employeeId}</p>
              <p><span className="font-semibold">Job Title:</span> Software Developer</p> {/* Placeholder */}
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Pay Period:</span> {payslip.payPeriod}</p>
              <p><span className="font-semibold">Pay Date:</span> 25/07/2024</p> {/* Placeholder */}
              <p><span className="font-semibold">Tax Ref No:</span> 123456789</p> {/* Placeholder */}
            </div>
          </div>
        )}

        <Separator />

        {/* Dynamic Sections */}
        {(payslipDesignSettings.sectionOrder || ["Earnings", "Deductions", "Leave"]).map((section: string) =>
          renderSection(section)
        )}

        <Separator />

        {/* Individual Payslip Earnings Breakdown Chart */}
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Earnings Breakdown</h4>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={payslip.earningsBreakdown}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {payslip.earningsBreakdown.map((entry, index) => (
                  <Cell key={`cell-earnings-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Individual Payslip Deductions Breakdown Chart */}
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">Deductions Breakdown</h4>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={payslip.deductionsBreakdown}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#82ca9d"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {payslip.deductionsBreakdown.map((entry, index) => (
                  <Cell key={`cell-deductions-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <Separator />

        {/* Bank Details */}
        {payslipDesignSettings.showBankDetails && (
          <div className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Bank Details</h4>
            <p className="text-xs">Bank: FNB</p>
            <p className="text-xs">Account No: *********1234</p>
            <p className="text-xs">Branch Code: 250655</p>
          </div>
        )}

        <Separator />

        {/* Net Pay (Always at bottom) */}
        <div className="flex justify-between items-center pt-2 mt-2">
          <h3 className="text-md font-bold">Net Pay</h3>
          <h3 className="text-md font-bold">R {payslip.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>
    </div>
  );
};

export default IndividualPayslipCard;