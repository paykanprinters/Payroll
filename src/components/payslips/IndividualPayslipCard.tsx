"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn, getPrintClasses } from "@/lib/utils"; // Import getPrintClasses
import { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces"; // Updated import

interface PayslipDesignSettings {
  showCompanyLogo?: boolean;
  showCompanyDetails?: boolean;
  showEmployeeDetails?: boolean;
  showEarningsBreakdown?: boolean;
  showDeductionsBreakdown?: boolean;
  showLeaveSummary?: boolean;
  showBankDetails?: boolean;
  showYTD?: boolean; // New setting for YTD calculations
  sectionOrder?: ("Earnings" | "Deductions")[]; // Only Earnings and Deductions are orderable
  layoutSize?: "Letter" | "A4" | "A5"; // Layout size setting
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right"; // New layout setting
}

interface IndividualPayslipCardProps {
  payslip: MockPayslip;
  payslipDesignSettings: PayslipDesignSettings;
  companyTradingName: string;
  companyLogoUrl: string | null;
  companyLogoSize: number;
  employees: MockEmployee[]; // Pass the full employees array
  getEmployeeName: (employeeId: string) => string;
}

const IndividualPayslipCard: React.FC<IndividualPayslipCardProps> = ({
  payslip,
  payslipDesignSettings,
  companyTradingName,
  companyLogoUrl,
  companyLogoSize,
  employees, // Destructure employees
  getEmployeeName,
}) => {
  const employee = employees.find(emp => emp.id === payslip.employeeId);

  // Retrieve company details from localStorage for display
  const companyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
  const companyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
  const vatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
  const physicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
  const mainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
  const companyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
  const companyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";


  // Helper to render specific content for earnings, deductions, or leave
  const renderEarningsContent = () => {
    if (!payslipDesignSettings.showEarningsBreakdown) return null;
    return (
      <div className="space-y-1">
        <h4 className="font-bold text-sm mb-1 underline print:text-base">EARNINGS</h4>
        {payslip.earningsBreakdown.map((item, idx) => (
          <p key={idx} className="text-xs print:text-sm flex justify-between">
            <span>{item.name}</span>
            <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
        <p className="text-xs font-bold mt-2 print:text-sm flex justify-between border-t pt-1">
          <span>GROSS EARNINGS</span>
          <span>R {payslip.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
        </p>
      </div>
    );
  };

  const renderDeductionsContent = () => {
    if (!payslipDesignSettings.showDeductionsBreakdown) return null;
    return (
      <div className="space-y-1">
        <h4 className="font-bold text-sm mb-1 underline print:text-base">DEDUCTIONS</h4>
        {payslip.deductionsBreakdown.map((item, idx) => (
          <p key={idx} className="text-xs print:text-sm flex justify-between">
            <span>{item.name}</span>
            <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
        <p className="text-xs font-bold mt-2 print:text-sm flex justify-between border-t pt-1">
          <span>TOTAL DEDUCTIONS</span>
          <span>R {payslip.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
        </p>
      </div>
    );
  };

  const renderLeaveSummaryContent = () => {
    if (!payslipDesignSettings.showLeaveSummary) return null;
    return (
      <div className="mt-4 pt-2 border-t border-dashed">
        <h4 className="font-bold text-sm mb-1 underline print:text-base">LEAVE SUMMARY</h4>
        <div className="grid grid-cols-2 gap-1 text-xs print:text-sm">
          <p>Annual Leave Remaining:</p> <p className="text-right">{payslip.leaveSummary.annual} days</p>
          <p>Sick Leave Remaining:</p> <p className="text-right">{payslip.leaveSummary.sick} days</p>
          {payslip.leaveSummary.unpaid > 0 && (
            <>
              <p>Unpaid Leave Taken:</p> <p className="text-right">{payslip.leaveSummary.unpaid} days</p>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderYTDContent = () => {
    if (!payslipDesignSettings.showYTD) return null;
    return (
      <div className="mt-4 pt-2 border-t border-dashed">
        <h4 className="font-bold text-sm mb-1 underline print:text-base">YEAR TO DATE (YTD)</h4>
        <div className="grid grid-cols-2 gap-1 text-xs print:text-sm">
          <p>Gross Earnings YTD:</p> <p className="text-right">R {payslip.ytdGrossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          <p>Total Deductions YTD:</p> <p className="text-right">R {payslip.ytdTotalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    );
  };

  const mainContentOrder = payslipDesignSettings.earningsDeductionsLayout === "earnings-left-deductions-right"
    ? [
        { content: renderEarningsContent(), align: "text-left" },
        { content: renderDeductionsContent(), align: "text-left" } // Align right for second column
      ]
    : [
        { content: renderDeductionsContent(), align: "text-left" },
        { content: renderEarningsContent(), align: "text-left" } // Align right for second column
      ];

  return (
    <div
      id={`payslip-${payslip.id}`}
      className={cn(
        "p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mx-auto max-w-lg",
        "print:shadow-none print:border print:border-gray-300 print:bg-white print:text-black print:mx-0 print:my-0",
        getPrintClasses(payslipDesignSettings.layoutSize) // Apply dynamic print classes
      )}
    >
      {/* Company Header */}
      <div className="flex justify-between items-start mb-4 print:mb-6">
        {payslipDesignSettings.showCompanyLogo && companyLogoUrl && (
          <img
            src={companyLogoUrl}
            alt="Company Logo"
            style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
            className="rounded-md print:w-[60px] print:h-[60px]"
          />
        )}
        <div className={cn("text-right text-xs print:text-sm", !payslipDesignSettings.showCompanyLogo && "w-full")}>
          <h2 className="text-md font-bold print:text-lg">{companyLegalName}</h2>
          {companyTradingName && companyTradingName !== companyLegalName && (
            <p className="text-sm print:text-base">{companyTradingName}</p>
          )}
          {payslipDesignSettings.showCompanyDetails && (
            <>
              <p>{physicalAddress}</p>
              <p>Reg. No: {companyRegistrationNumber}</p>
              <p>VAT No: {vatRegistrationNumber}</p>
              <p>Tel: {mainContactNumber}</p>
              <p>Email: {companyEmail}</p>
              <p>Web: {companyWebsite}</p>
            </>
          )}
        </div>
      </div>

      <Separator className="my-4 print:my-4" />

      <h3 className="text-lg font-bold text-center mb-3 print:text-xl print:mb-4">PAYSLIP</h3>
      <div className="text-center text-sm mb-4 print:text-base print:mb-6">
        <p><span className="font-semibold">PAY PERIOD:</span> {payslip.payPeriod}</p>
        <p><span className="font-semibold">PAY DATE:</span> 25/07/2024</p> {/* Placeholder */}
      </div>

      <Separator className="my-4 print:my-4" />

      {/* Employee & Bank Details */}
      {payslipDesignSettings.showEmployeeDetails && employee && (
        <div className="grid grid-cols-2 gap-4 text-xs print:text-sm print:gap-6 mb-4">
          <div className="space-y-1">
            <p><span className="font-semibold">Employee Name:</span> {getEmployeeName(payslip.employeeId)}</p>
            <p><span className="font-semibold">Employee No:</span> {employee.id}</p>
            <p><span className="font-semibold">ID No:</span> {employee.idNumber || "N/A"}</p>
            <p><span className="font-semibold">Job Title:</span> {employee.jobTitle}</p>
            <p><span className="font-semibold">Tax No:</span> {employee.taxReferenceNumber || "N/A"}</p>
          </div>
          {payslipDesignSettings.showBankDetails && (
            <div className="space-y-1 text-right">
              <p><span className="font-semibold">Bank Name:</span> {employee.bankName || "N/A"}</p>
              <p><span className="font-semibold">Account No:</span> {employee.bankAccountNumber ? `********${employee.bankAccountNumber.slice(-4)}` : "N/A"}</p>
              <p><span className="font-semibold">Branch Code:</span> {employee.bankBranchCode || "N/A"}</p>
              <p><span className="font-semibold">Account Type:</span> {employee.bankAccountType || "N/A"}</p>
            </div>
          )}
        </div>
      )}

      <Separator className="my-4 print:my-4" />

      {/* Main Pay Information: Earnings/Deductions */}
      <div className="grid grid-cols-2 gap-6 mt-4 print:mt-6 print:gap-8">
        {mainContentOrder.map((item, index) => (
          <div key={index} className={item.align}>{item.content}</div>
        ))}
      </div>

      <Separator className="my-4 print:my-4" />

      {/* Net Pay (Always at bottom) */}
      <div className="flex justify-between items-center pt-2 mt-2 print:pt-4 print:mt-4">
        <h3 className="text-lg font-bold print:text-xl">NET PAY</h3>
        <h3 className="text-lg font-bold print:text-xl">R {payslip.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h3>
      </div>
      
      {/* Leave Summary (Moved below Net Pay) */}
      {renderLeaveSummaryContent()}

      {/* YTD Calculations */}
      {renderYTDContent()}
    </div>
  );
};

export default IndividualPayslipCard;