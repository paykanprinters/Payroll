"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  sectionOrder?: ("Earnings" | "Deductions")[];
  layoutSize?: "Letter" | "A4" | "A5"; // Layout size setting
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right"; // New layout setting
}

interface IndividualPayslipCardProps {
  payslip: MockPayslip;
  payslipDesignSettings: PayslipDesignSettings;
  companyTradingName: string;
  companyLogoUrl: string | null;
  companyLogoSize: number;
  getEmployeeName: (employeeId: string) => string;
}

const IndividualPayslipCard: React.FC<IndividualPayslipCardProps> = ({
  payslip,
  payslipDesignSettings,
  companyTradingName,
  companyLogoUrl,
  companyLogoSize,
  getEmployeeName,
}) => {

  // Helper to render specific content for earnings, deductions, or leave
  const renderEarningsContent = () => {
    if (!payslipDesignSettings.showEarningsBreakdown) return null;
    return (
      <div>
        <h4 className="font-semibold text-sm mb-1 print:text-base">Earnings</h4>
        {payslip.earningsBreakdown.map((item, idx) => (
          <p key={idx} className="text-xs print:text-sm">{item.name}: R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
        ))}
        <p className="text-xs font-semibold mt-1 print:text-sm">Gross Earnings: R {payslip.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
      </div>
    );
  };

  const renderDeductionsContent = () => {
    if (!payslipDesignSettings.showDeductionsBreakdown) return null;
    return (
      <div>
        <h4 className="font-semibold text-sm mb-1 print:text-base">Deductions</h4>
        {payslip.deductionsBreakdown.map((item, idx) => (
          <p key={idx} className="text-xs print:text-sm">{item.name}: R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
        ))}
        <p className="text-xs font-semibold mt-1 print:text-sm">Total Deductions: R {payslip.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
      </div>
    );
  };

  const renderLeaveSummaryContent = () => {
    if (!payslipDesignSettings.showLeaveSummary) return null;
    return (
      <div>
        <p className="font-semibold print:text-base">Leave Summary:</p>
        <p className="text-xs print:text-sm">Annual Leave Remaining: {payslip.leaveSummary.annual} days</p>
        <p className="text-xs print:text-sm">Sick Leave Remaining: {payslip.leaveSummary.sick} days</p>
        {payslip.leaveSummary.unpaid > 0 && (
          <p className="text-xs print:text-sm">Unpaid Leave Taken: {payslip.leaveSummary.unpaid} days</p>
        )}
      </div>
    );
  };

  const renderBankDetailsContent = () => {
    if (!payslipDesignSettings.showBankDetails) return null;
    return (
      <div className="mt-2">
        <p className="font-semibold print:text-base">Bank Details:</p>
        <p className="text-xs print:text-sm">Bank: FNB</p>
        <p className="text-xs print:text-sm">Account No: *********1234</p>
        <p className="text-xs print:text-sm">Branch Code: 250655</p>
      </div>
    );
  };

  const getPrintClasses = (layoutSize: "Letter" | "A4" | "A5" | undefined) => {
    switch (layoutSize) {
      case "Letter":
        return "print:w-letter print:min-h-letter print:p-6 print:text-sm";
      case "A5":
        return "print:w-a5 print:min-h-a5 print:p-4 print:text-xs";
      case "A4":
      default:
        return "print:w-a4 print:min-h-a4 print:p-8 print:text-base";
    }
  };

  const mainContentOrder = payslipDesignSettings.earningsDeductionsLayout === "earnings-left-deductions-right"
    ? [
        { content: renderEarningsContent(), align: "text-left" },
        { content: renderDeductionsContent(), align: "text-right" }
      ]
    : [
        { content: renderDeductionsContent(), align: "text-left" },
        { content: renderEarningsContent(), align: "text-right" }
      ];

  return (
    <div 
      id={`payslip-${payslip.id}`} 
      className={cn(
        "p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mx-auto max-w-lg",
        "print:shadow-none print:border-none print:bg-white print:text-black",
        getPrintClasses(payslipDesignSettings.layoutSize)
      )}
    >
      <h3 className="text-lg font-bold mb-3 text-center print:text-xl print:mb-6">Payslip</h3>
      <div className="border p-4 rounded-md space-y-3 text-sm print:border-none print:p-0 print:space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 print:mb-6">
          {payslipDesignSettings.showCompanyLogo && companyLogoUrl && (
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
              className="rounded-md print:w-[60px] print:h-[60px]" // Adjust logo size for print
            />
          )}
          <div className={cn("text-right flex-grow", !payslipDesignSettings.showCompanyLogo && "w-full")}>
            <h2 className="text-md font-bold print:text-lg">{companyTradingName}</h2>
            {payslipDesignSettings.showCompanyDetails && (
              <>
                <p className="text-xs print:text-sm">123 Corporate Ave, Business City, 1234</p>
                <p className="text-xs print:text-sm">Reg. No: 2023/123456/07</p>
                <p className="text-xs print:text-sm">Tax No: 9876543210</p>
              </>
            )}
          </div>
        </div>

        <Separator className="print:my-4" />

        {/* Employee Details */}
        {payslipDesignSettings.showEmployeeDetails && (
          <div className="grid grid-cols-2 gap-2 text-xs print:text-sm print:gap-4">
            <div>
              <p><span className="font-semibold">Employee Name:</span> {getEmployeeName(payslip.employeeId)}</p>
              <p><span className="font-semibold">Employee ID:</span> {payslip.employeeId}</p>
              <p><span className="font-semibold">Job Title:</span> Software Developer</p> {/* Placeholder */}
              {renderBankDetailsContent()} {/* Bank details moved here */}
            </div>
            <div className="text-right">
              <p><span className="font-semibold">Pay Period:</span> {payslip.payPeriod}</p>
              <p><span className="font-semibold">Pay Date:</span> 25/07/2024</p> {/* Placeholder */}
              <p><span className="font-semibold">Tax Ref No:</span> 123456789</p> {/* Placeholder */}
              {renderLeaveSummaryContent()} {/* Leave summary moved here */}
            </div>
          </div>
        )}

        <Separator className="print:my-4" />

        {/* Main Pay Information: Earnings/Deductions */}
        <div className="grid grid-cols-2 gap-4 mt-4 print:mt-6 print:gap-8">
          {mainContentOrder.map((item, index) => (
            <div key={index} className={item.align}>{item.content}</div>
          ))}
        </div>

        <Separator className="print:my-4" />

        {/* Net Pay (Always at bottom) */}
        <div className="flex justify-between items-center pt-2 mt-2 print:pt-4 print:mt-4">
          <h3 className="text-md font-bold print:text-lg">Net Pay</h3>
          <h3 className="text-md font-bold print:text-lg">R {payslip.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>
    </div>
  );
};

export default IndividualPayslipCard;