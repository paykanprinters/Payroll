"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn, getPrintStyles } from "@/lib/utils";
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
  onReadyForPdf?: () => void; // Callback to signal readiness for PDF generation
}

const IndividualPayslipCard: React.FC<IndividualPayslipCardProps> = ({
  payslip,
  payslipDesignSettings,
  companyDetails,
  employees,
  getEmployeeName,
  isPdfGeneration = false,
  onReadyForPdf,
}) => {
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
  const printStyles = getPrintStyles(payslipDesignSettings.layoutSize);
  const baseFontSizePx = parseFloat(printStyles.fontSize?.toString().replace('px', '') || '14'); // Ensure it's a number

  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!isPdfGeneration) {
      setImagesLoaded(true); // Not generating PDF, so no need to wait for images
      return;
    }

    if (companyLogoUrl && imageRef.current) {
      if (imageRef.current.complete) {
        setImagesLoaded(true);
      } else {
        const handleImageLoad = () => {
          setImagesLoaded(true);
        };
        const handleImageError = () => {
          console.warn("Company logo failed to load for PDF generation.");
          setImagesLoaded(true); // Still resolve to not block PDF generation
        };
        imageRef.current.addEventListener('load', handleImageLoad);
        imageRef.current.addEventListener('error', handleImageError);
        return () => {
          imageRef.current?.removeEventListener('load', handleImageLoad);
          imageRef.current?.removeEventListener('error', handleImageError);
        };
      }
    } else {
      setImagesLoaded(true); // No logo or not PDF generation, so ready
    }
  }, [companyLogoUrl, isPdfGeneration]);

  React.useEffect(() => {
    if (imagesLoaded && onReadyForPdf) {
      onReadyForPdf();
    }
  }, [imagesLoaded, onReadyForPdf]);

  // Helper to render text with dynamic font size and line height
  const renderText = (text: string | number | undefined, scale: number = 1, className: string = "") => {
    if (text === undefined || text === null || text === "") return "N/A";
    return (
      <span className={className} style={isPdfGeneration ? { fontSize: `${baseFontSizePx * scale}px`, lineHeight: `${baseFontSizePx * scale * 1.2}px` } : {}}>
        {text}
      </span>
    );
  };

  // Helper to render a paragraph with dynamic font size and margin
  const renderParagraph = (label: string, value: string | number | undefined, scale: number = 0.9, marginBottomScale: number = 0.2) => {
    return (
      <p style={isPdfGeneration ? { fontSize: `${baseFontSizePx * scale}px`, lineHeight: `${baseFontSizePx * scale * 1.2}px`, marginBottom: `${baseFontSizePx * marginBottomScale}px` } : {}}>
        <span className="font-semibold">{label}:</span> {renderText(value, scale)}
      </p>
    );
  };

  const renderEarningsContent = () => {
    if (!payslipDesignSettings.showEarningsBreakdown) return null;
    return (
      <div style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.5}px` } : {}}>
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, lineHeight: `${baseFontSizePx * 1.1 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.4}px` } : {}}>EARNINGS</h4>
        {payslip.earningsBreakdown.map((item, idx) => (
          <p key={idx} className="flex justify-between" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>
            <span>{item.name}</span>
            <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
        <p className="font-bold border-t pt-1 flex justify-between" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px`, marginTop: `${baseFontSizePx * 0.5}px`, paddingTop: `${baseFontSizePx * 0.25}px` } : {}}>
          <span>GROSS EARNINGS</span>
          <span>R {payslip.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
        </p>
      </div>
    );
  };

  const renderDeductionsContent = () => {
    if (!payslipDesignSettings.showDeductionsBreakdown) return null;
    return (
      <div style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.5}px` } : {}}>
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, lineHeight: `${baseFontSizePx * 1.1 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.4}px` } : {}}>DEDUCTIONS</h4>
        {payslip.deductionsBreakdown.map((item, idx) => (
          <p key={idx} className="flex justify-between" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>
            <span>{item.name}</span>
            <span>R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
          </p>
        ))}
        <p className="font-bold border-t pt-1 flex justify-between" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px`, marginTop: `${baseFontSizePx * 0.5}px`, paddingTop: `${baseFontSizePx * 0.25}px` } : {}}>
          <span>TOTAL DEDUCTIONS</span>
          <span>R {payslip.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
        </p>
      </div>
    );
  };

  const renderLeaveSummaryContent = () => {
    if (!payslipDesignSettings.showLeaveSummary) return null;
    return (
      <div style={isPdfGeneration ? { marginTop: `${baseFontSizePx * 1}px`, paddingTop: `${baseFontSizePx * 0.5}px`, borderTop: '1px dashed #ccc' } : {}} className="mt-4 pt-2 border-t border-dashed">
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, lineHeight: `${baseFontSizePx * 1.1 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.4}px` } : {}}>LEAVE SUMMARY</h4>
        <div style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px` } : {}}>
          <p className="flex justify-between"><span>Annual Leave Remaining:</span> <span className="text-right">{payslip.leaveSummary.annual} days</span></p>
          <p className="flex justify-between"><span>Sick Leave Remaining:</span> <span className="text-right">{payslip.leaveSummary.sick} days</span></p>
          {payslip.leaveSummary.unpaid > 0 && (
            <p className="flex justify-between"><span>Unpaid Leave Taken:</span> <span className="text-right">{payslip.leaveSummary.unpaid} days</span></p>
          )}
        </div>
      </div>
    );
  };

  const renderYTDContent = () => {
    if (!payslipDesignSettings.showYTD) return null;
    return (
      <div style={isPdfGeneration ? { marginTop: `${baseFontSizePx * 1}px`, paddingTop: `${baseFontSizePx * 0.5}px`, borderTop: '1px dashed #ccc' } : {}} className="mt-4 pt-2 border-t border-dashed">
        <h4 className="font-bold underline" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.1}px`, lineHeight: `${baseFontSizePx * 1.1 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.4}px` } : {}}>YEAR TO DATE (YTD)</h4>
        <div style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px` } : {}}>
          <p className="flex justify-between"><span>Gross Earnings YTD:</span> <span className="text-right">R {payslip.ytdGrossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></p>
          <p className="flex justify-between"><span>Total Deductions YTD:</span> <span className="text-right">R {payslip.ytdTotalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></p>
        </div>
      </div>
    );
  };

  const mainContentOrder = payslipDesignSettings.earningsDeductionsLayout === "earnings-left-deductions-right"
    ? [
        { content: renderEarningsContent() },
        { content: renderDeductionsContent() }
      ]
    : [
        { content: renderDeductionsContent() },
        { content: renderEarningsContent() }
      ];

  // Helper to get Tailwind classes for width/min-height for UI preview
  const getPreviewPageClasses = (layoutSize: "Letter" | "A4" | "A5" | undefined) => {
    switch (layoutSize) {
      case "Letter":
        return "w-letter min-h-letter";
      case "A5":
        return "w-a5 min-h-a5";
      case "A4":
      default:
        return "w-a4 min-h-a4";
    }
  };

  return (
    <div
      id={`payslip-${payslip.id}`}
      className={cn(
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        !isPdfGeneration && "mx-auto rounded-lg shadow-lg", // Apply rounded-lg and shadow-lg for UI preview
        !isPdfGeneration && getPreviewPageClasses(payslipDesignSettings.layoutSize) // width/min-height for UI preview
      )}
      style={isPdfGeneration ? {
        ...printStyles, // fontSize from utils
        padding: '24px', // Explicit internal padding for PDF
        border: 'none', // No border for PDF generation, will be drawn programmatically
        boxShadow: 'none',
      } : {
        // UI preview styles
        padding: '24px', // Consistent padding for UI preview
        fontSize: printStyles.fontSize,
        border: '1px solid #ccc', // Lighter border for UI preview
        boxShadow: '0 0 10px rgba(0,0,0,0.1)', // Shadow for UI preview
      }}
    >
      {/* Company Header */}
      <div style={isPdfGeneration ? { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: `${baseFontSizePx * 1.5}px` } : {}} className="flex justify-between items-start mb-4">
        {payslipDesignSettings.showCompanyLogo && companyLogoUrl && (
          <div style={isPdfGeneration ? { width: `${companyLogoSize}px`, height: `${companyLogoSize}px`, flexShrink: 0, marginRight: `${baseFontSizePx * 0.5}px` } : {}} className="flex-shrink-0 mr-2">
            <img
              ref={imageRef}
              src={companyLogoUrl}
              alt="Company Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              className="rounded-md"
            />
          </div>
        )}
        {payslipDesignSettings.showCompanyDetails && (
          <div style={isPdfGeneration ? { textAlign: 'right', fontSize: `${baseFontSizePx * 0.9}px`, lineHeight: `${baseFontSizePx * 0.9 * 1.2}px`, flexGrow: 1, width: payslipDesignSettings.showCompanyLogo && companyLogoUrl ? 'calc(100% - ' + (companyLogoSize + baseFontSizePx * 0.5) + 'px)' : '100%' } : {}} className={cn("text-right flex-grow", !payslipDesignSettings.showCompanyLogo && "w-full")}>
            <h2 className="font-bold" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.2}px`, lineHeight: `${baseFontSizePx * 1.2 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>{companyLegalName}</h2>
            {companyTradingName && companyTradingName !== companyLegalName && (
              <p style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1}px`, lineHeight: `${baseFontSizePx * 1 * 1.2}px`, marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>{companyTradingName}</p>
            )}
            <p style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>{physicalAddress}</p>
            <p style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>Reg. No: {companyRegistrationNumber}</p>
            <p style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>VAT No: {vatRegistrationNumber}</p>
            <p style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>Tel: {mainContactNumber}</p>
            <p style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>Email: {companyEmail}</p>
            <p style={isPdfGeneration ? { marginBottom: `${baseFontSizePx * 0.1}px` } : {}}>Web: {companyWebsite}</p>
          </div>
        )}
      </div>

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      <h3 className="font-bold text-center mb-3" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.3}px`, lineHeight: `${baseFontSizePx * 1.3 * 1.2}px`, marginBottom: `${baseFontSizePx * 1}px` } : {}}>PAYSLIP</h3>
      <div className="text-center mb-4" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1}px`, lineHeight: `${baseFontSizePx * 1 * 1.2}px`, marginBottom: `${baseFontSizePx * 1.5}px` } : {}}>
        <p><span className="font-semibold">PAY PERIOD:</span> {payslip.payPeriod}</p>
        <p><span className="font-semibold">PAY DATE:</span> 25/07/2024</p> {/* Placeholder */}
      </div>

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      {/* Employee & Bank Details */}
      {payslipDesignSettings.showEmployeeDetails && employee && (
        <div style={isPdfGeneration ? { display: 'flex', justifyContent: 'space-between', marginBottom: `${baseFontSizePx * 1.5}px` } : {}} className="grid grid-cols-2 gap-4 mb-4">
          <div style={isPdfGeneration ? { flex: '1', marginRight: `${baseFontSizePx * 0.5}px` } : {}} className="space-y-1">
            {renderParagraph("Employee Name", getEmployeeName(payslip.employeeId))}
            {renderParagraph("Employee No", employee.id)}
            {renderParagraph("ID No", employee.idNumber)}
            {renderParagraph("Job Title", employee.jobTitle)}
            {renderParagraph("Tax No", employee.taxReferenceNumber)}
          </div>
          {payslipDesignSettings.showBankDetails && (
            <div style={isPdfGeneration ? { flex: '1', textAlign: 'right', marginLeft: `${baseFontSizePx * 0.5}px` } : {}} className="space-y-1 text-right">
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
      <div style={isPdfGeneration ? { display: 'flex', justifyContent: 'space-between', marginTop: `${baseFontSizePx * 1.5}px`, marginBottom: `${baseFontSizePx * 1.5}px` } : {}} className="grid grid-cols-2 gap-6 mt-4">
        <div style={isPdfGeneration ? { flex: '1', marginRight: `${baseFontSizePx * 0.5}px` } : {}}>
          {mainContentOrder[0].content}
        </div>
        <div style={isPdfGeneration ? { flex: '1', marginLeft: `${baseFontSizePx * 0.5}px` } : {}}>
          {mainContentOrder[1].content}
        </div>
      </div>

      <Separator className="my-4" style={isPdfGeneration ? { margin: `${baseFontSizePx * 1}px 0` } : {}} />

      {/* Net Pay (Always at bottom) */}
      <div style={isPdfGeneration ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: `${baseFontSizePx * 1}px`, marginTop: `${baseFontSizePx * 1}px` } : {}} className="flex justify-between items-center pt-2 mt-2">
        <h3 className="font-bold" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.3}px`, lineHeight: `${baseFontSizePx * 1.3 * 1.2}px` } : {}}>NET PAY</h3>
        <h3 className="font-bold" style={isPdfGeneration ? { fontSize: `${baseFontSizePx * 1.3}px`, lineHeight: `${baseFontSizePx * 1.3 * 1.2}px` } : {}}>R {payslip.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h3>
      </div>
      
      {/* Leave Summary (Moved below Net Pay) */}
      {renderLeaveSummaryContent()}

      {/* YTD Calculations */}
      {renderYTDContent()}
    </div>
  );
};

export default IndividualPayslipCard;