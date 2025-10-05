"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn, getPrintStyles } from "@/lib/utils"; // Import getPrintStyles
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";

interface PayslipDesignSettings {
  showCompanyLogo?: boolean;
  showCompanyDetails?: boolean;
  showEmployeeDetails?: boolean;
  showEarningsBreakdown?: boolean;
  showDeductionsBreakdown?: boolean;
  showLeaveSummary?: boolean;
  showBankDetails?: boolean;
  showYTD?: boolean;
  sectionOrder?: ("Earnings" | "Deductions")[];
  layoutSize?: "Letter" | "A4" | "A5";
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right";
}

interface IndividualPayslipCardProps {
  payslip: MockPayslip;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails;
  employees: MockEmployee[];
  getEmployeeName: (employeeId: string) => string;
  isPdfGeneration?: boolean;
}

const IndividualPayslipCard: React.FC<IndividualPayslipCardProps> = ({
  payslip,
  payslipDesignSettings,
  companyDetails,
  employees,
  getEmployeeName,
  isPdfGeneration = false,
}) => {
  if (isPdfGeneration) {
    console.log(`IndividualPayslipCard: Rendering for PDF generation for employee ${payslip.employeeId}, payslip ${payslip.id}`);
  }

  const employee = employees.find(emp => emp.id === payslip.employeeId);

  const {
    companyLegalName,
    companyTradingName,
    companyRegistrationNumber,
    vatRegistrationNumber,
    physicalAddress,
    mainContactNumber,
    companyEmail,
    companyWebsite,
    logoUrl: companyLogoUrl,
    logoSize: companyLogoSize,
  } = companyDetails;

  // Get explicit print styles based on layout size
  const printStyles = isPdfGeneration ? getPrintStyles(payslipDesignSettings.layoutSize) : {};
  const baseFontSizePx = parseFloat(printStyles.fontSize?.toString().replace('px', '') || '14'); // Ensure it's a number

  // Helper to render text with dynamic font size
  const renderText = (text: string | number | undefined, scale: number = 1, className: string = "") => {
    if (text === undefined || text === null || text === "") return "N/A";
    return (
      <span className={className} style={isPdfGeneration ? { fontSize: `${baseFontSizePx * scale}px` } : {}}>
        {text}
      </span>
    );
  };

  // Helper to render a paragraph with dynamic font size
  const renderParagraph = (label: string, value: string | number | undefined, scale: number = 0.9) => {
    return (
      <p style={isPdfGeneration ? { fontSize: `${baseFontSizePx * scale}px` } : {}}>
        <span className="font-semibold">{label}:</span> {renderText(value, scale)}
      </p>
    );
  };

  const renderEarningsContent = () => {
    if (!payslipDesignSettings.showEarningsBreakdown) return null;
    return (
      <div className="space-y-1">
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, marginBottom: `${baseFontSizePx * 0.2}px` } : {}}>EARNINGS</h4>
        {payslip.earningsBreakdown.map((item, idx) => (
          <p key={idx} className="flex justify-between" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px` } : {}}>
            <span>{item.name}</span>
            <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
        <p className="font-bold mt-2 flex justify-between border-t pt-1" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, marginTop: `${baseFontSizePx * 0.5}px`, paddingTop: `${baseFontSizePx * 0.25}px` } : {}}>
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
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, marginBottom: `${baseFontSizePx * 0.2}px` } : {}}>DEDUCTIONS</h4>
        {payslip.deductionsBreakdown.map((item, idx) => (
          <p key={idx} className="flex justify-between" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px` } : {}}>
            <span>{item.name}</span>
            <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
        <p className="font-bold mt-2 flex justify-between border-t pt-1" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, marginTop: `${baseFontSizePx * 0.5}px`, paddingTop: `${baseFontSizePx * 0.25}px` } : {}}>
          <span>TOTAL DEDUCTIONS</span>
          <span>R {payslip.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
        </p>
      </div>
    );
  };

  const renderLeaveSummaryContent = () => {
    if (!payslipDesignSettings.showLeaveSummary) return null;
    return (
      <div className="mt-4 pt-2 border-t border-dashed" style={isPdfGeneration ? { marginTop: `${baseFontSizePx * 1}px`, paddingTop: `${baseFontSizePx * 0.5}px` } : {}}>
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, marginBottom: `${baseFontSizePx * 0.2}px` } : {}}>LEAVE SUMMARY</h4>
        <div className="grid grid-cols-2 gap-1" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, gap: `${baseFontSizePx * 0.5}px` } : {}}>
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
      <div className="mt-4 pt-2 border-t border-dashed" style={isPdfGeneration ? { marginTop: `${baseFontSizePx * 1}px`, paddingTop: `${baseFontSizePx * 0.5}px` } : {}}>
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px` } : {}}>YEAR TO DATE (YTD)</h4>
        <div className="grid grid-cols-2 gap-1" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, gap: `${baseFontSizePx * 0.5}px` } : {}}>
          <p>Gross Earnings YTD:</p> <p className="text-right">R {payslip.ytdGrossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          <p>Total Deductions YTD:</p> <p className="text-right">R {payslip.ytdTotalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>
    );
  };

  const mainContentOrder = payslipDesignSettings.earningsDeductionsLayout === "earnings-left-deductions-right"
    ? [
        { content: renderEarningsContent(), align: "text-left" },
        { content: renderDeductionsContent(), align: "text-left" }
      ]
    : [
        { content: renderDeductionsContent(), align: "text-left" },
        { content: renderEarningsContent(), align: "text-left" }
      ];

  return (
    <div
      id={`payslip-${payslip.id}`}
      className={cn(
        "p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        isPdfGeneration ? "" : "mx-auto max-w-lg", // Only apply max-w-lg for UI preview
        !isPdfGeneration && "print:shadow-none print:border print:border-gray-300 print:bg-white print:text-black print:mx-0 print:my-0",
      )}
      style={isPdfGeneration ? { ...printStyles, border: '1px solid #ccc', boxShadow: 'none' } : {}} // Apply explicit styles for PDF
    >
      {/* Company Header */}
      <div className="flex justify-between items-start mb-4" style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 1.5}px` } : {}}>
        {payslipDesignSettings.showCompanyLogo && companyLogoUrl && (
          <img
            src={companyLogoUrl}
            alt="Company Logo"
            style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
            className="rounded-md flex-shrink-0"
          />
        )}
        {payslipDesignSettings.showCompanyDetails && (
          <div className={cn("text-right flex-grow", !payslipDesignSettings.showCompanyLogo && "w-full")} style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px` } : {}}>
            <h2 className="font-bold" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.2}px` } : {}}>{companyLegalName}</h2>
            {companyTradingName && companyTradingName !== companyLegalName && (
              <p style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1}px` } : {}}>{companyTradingName}</p>
            )}
            <p>{physicalAddress}</p>
            <p>Reg. No: {companyRegistrationNumber}</p>
            <p>VAT No: {vatRegistrationNumber}</p>
            <p>Tel: {mainContactNumber}</p>
            <p>Email: {companyEmail}</p>
            <p>Web: {companyWebsite}</p>
          </div>
        )}
      </div>

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      <h3 className="font-bold text-center mb-3" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.3}px`, marginBottom: `${baseFontSizePx * 1}px` } : {}}>PAYSLIP</h3>
      <div className="text-center mb-4" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1}px`, marginBottom: `${baseFontSizePx * 1.5}px` } : {}}>
        <p><span className="font-semibold">PAY PERIOD:</span> {payslip.payPeriod}</p>
        <p><span className="font-semibold">PAY DATE:</span> 25/07/2024</p> {/* Placeholder */}
      </div>

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      {/* Employee & Bank Details */}
      {payslipDesignSettings.showEmployeeDetails && employee && (
        <div className="grid grid-cols-2 gap-4 mb-4" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, gap: `${baseFontSizePx * 1.5}px`, marginBottom: `${baseFontSizePx * 1.5}px` } : {}}>
          <div className="space-y-1">
            {renderParagraph("Employee Name", getEmployeeName(payslip.employeeId))}
            {renderParagraph("Employee No", employee.id)}
            {renderParagraph("ID No", employee.idNumber)}
            {renderParagraph("Job Title", employee.jobTitle)}
            {renderParagraph("Tax No", employee.taxReferenceNumber)}
          </div>
          {payslipDesignSettings.showBankDetails && (
            <div className="space-y-1 text-right">
              {renderParagraph("Bank Name", employee.bankName)}
              {renderParagraph("Account No", employee.ibanNumber ? `********${employee.ibanNumber.slice(-4)}` : "N/A")}
              {renderParagraph("Branch Code", employee.routingSwiftCode)}
              {renderParagraph("Account Type", employee.bankAccountType)}
            </div>
          )}
        </div>
      )}

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      {/* Main Pay Information: Earnings/Deductions */}
      <div className="grid grid-cols-2 gap-6 mt-4" style={isPdfGeneration ? { marginTop: `${baseFontSizePx * 1.5}px`, gap: `${baseFontSizePx * 2}px` } : {}}>
        {mainContentOrder.map((item, index) => (
          <div key={index} className={item.align}>{item.content}</div>
        ))}
      </div>

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      {/* Net Pay (Always at bottom) */}
      <div className="flex justify-between items-center pt-2 mt-2" style={isPdfGeneration ? { paddingTop: `${baseFontSizePx * 1}px`, marginTop: `${baseFontSizePx * 1}px` } : {}}>
        <h3 className="font-bold" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.3}px` } : {}}>NET PAY</h3>
        <h3 className="font-bold" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.3}px` } : {}}>R {payslip.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h3>
      </div>
      
      {/* Leave Summary (Moved below Net Pay) */}
      {renderLeaveSummaryContent()}

      {/* YTD Calculations */}
      {renderYTDContent()}
    </div>
  );
};

export default IndividualPayslipCard;