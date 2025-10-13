"use client";

import React from "react";
import ReactDOM from 'react-dom/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getPrintStyles } from "@/lib/utils";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import ReportContentWrapper from "./ReportContentWrapper"; // Import the new component
import { usePdfGenerator } from "@/hooks/use-pdf-generator"; // Import usePdfGenerator

interface ReportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportContent: string; // HTML string for the report body
  companyLegalName: string;
  companyTradingName: string;
  physicalAddress: string;
  mainContactNumber: string;
  companyEmail: string;
  companyWebsite: string;
  companyRegistrationNumber: string;
  vatRegistrationNumber: string;
  companyLogoUrl: string | null;
  companyLogoWidth: number; // New field for logo width
  companyLogoHeight: number; // New field for logo height
  companyLogoFit: "contain" | "cover" | "fill" | "none" | "scale-down"; // New field for object-fit
  reportDesignSettings: ReportDesignSettings; // Prop for report design settings
  documentType: 'payslip' | 'report'; // New prop for document type
}

const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportContent,
  companyLegalName,
  companyTradingName,
  physicalAddress,
  mainContactNumber,
  companyEmail,
  companyWebsite,
  companyRegistrationNumber,
  vatRegistrationNumber,
  companyLogoUrl,
  companyLogoWidth, // This is the old size, will be replaced by width/height
  companyLogoHeight, // This is the old size, will be replaced by width/height
  companyLogoFit, // This is the old size, will be replaced by width/height
  reportDesignSettings,
  documentType,
}) => {
  // Retrieve new logo properties from localStorage for the preview
  // These are already passed as props, so no need to retrieve from localStorage again.
  // The props should be used directly.

  const companyDetails: MockCompanyDetails = {
    companyLegalName, companyTradingName, companyRegistrationNumber,
    companyTaxNumber: "", // Not used in report header, but required by interface
    vatRegistrationNumber, industry: "", // Not used in report header
    payeReferenceNumber: "", uifReferenceNumber: "", sdlReferenceNumber: "", coidaRegistrationNumber: "", // Not used
    physicalAddress, postalAddress: "", mainContactNumber, alternativeContactNumber: "",
    companyEmail, companyWebsite, bankName: "", accountHolderName: "", accountNumber: "",
    branchCode: "", accountType: "Cheque", logoUrl: companyLogoUrl || "",
    logoWidth: companyLogoWidth, // Use new width
    logoHeight: companyLogoHeight, // Use new height
    logoFit: companyLogoFit, // Use new fit
  };

  // Define displayCompanyName within this component's scope
  const displayCompanyName = companyLegalName || companyTradingName || "Your Company Name";

  // Get explicit print styles for the preview display
  const previewStyles = getPrintStyles(reportDesignSettings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(previewStyles.fontSize?.toString() || '14px');

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

  const { generatePdf, printPdf } = usePdfGenerator(); // Use the hook

  const handlePrintOrDownload = async (action: 'print' | 'download') => {
    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <ReportContentWrapper
        reportTitle={reportTitle}
        reportContent={reportContent}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        onReadyForPdf={onReadyForPdf}
        isPdfGeneration={true}
      />
    );

    const options = {
      filename: `${reportTitle.replace(/\s/g, '-')}.pdf`,
      format: reportDesignSettings.defaultReportPaperSize.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: documentType, // Pass documentType from props
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>Preview and manage your report.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          {/* This is the UI preview, not the content for PDF generation */}
          <div className={cn(
            "bg-white text-gray-900 mx-auto rounded-lg shadow-lg", // Apply rounded-lg and shadow-lg for UI preview
            getPreviewPageClasses(reportDesignSettings.defaultReportPaperSize), // Apply width/min-height classes
          )}
          style={{
            padding: '24px', // Consistent padding for UI preview
            fontSize: previewStyles.fontSize,
            border: '1px solid #ccc', // Lighter border for UI preview
            boxShadow: '0 0 10px rgba(0,0,0,0.1)', // Shadow for UI preview
          }}
          >
            {/* Report Header with Company Details */}
            {(reportDesignSettings.includeCompanyLogo && companyLogoUrl) || reportDesignSettings.includeCompanyDetails ? (
              <div className="flex justify-between items-start mb-6 print:mb-8">
                {reportDesignSettings.includeCompanyLogo && companyLogoUrl && (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    style={{ width: companyLogoWidth, height: companyLogoHeight, objectFit: companyLogoFit }}
                    className="rounded-md flex-shrink-0 print:w-[60px] print:h-[60px]"
                  />
                )}
                {reportDesignSettings.includeCompanyDetails && (
                  <div className="text-right text-[13px] print:text-[13px] w-full" style={{ fontSize: `${baseFontSizePx * 0.9}px` }}>
                    <h2 className="text-md font-bold print:text-lg" style={{ fontSize: `${baseFontSizePx * 1.2}px` }}>{displayCompanyName}</h2>
                    {companyTradingName && companyTradingName !== companyLegalName && (
                      <p className="text-[13px] print:text-[13px]" style={{ fontSize: `${baseFontSizePx * 1}px` }}>{companyTradingName}</p>
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
            ) : null}

            <Separator className="my-4 print:my-4" style={{ margin: `${baseFontSizePx * 1}px 0` }} />

            <h3 className="text-lg font-bold text-center mb-4 print:text-xl print:mb-6" style={{ fontSize: `${baseFontSizePx * 1.3}px`, marginBottom: `${baseFontSizePx * 1}px` }}>{reportTitle}</h3>

            {/* Report Content */}
            <div
              dangerouslySetInnerHTML={{ __html: reportContent }}
              style={{ fontSize: `${reportDesignSettings.reportContentFontSize}px` }}
            />
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => handlePrintOrDownload('print')}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
          <Button onClick={() => handlePrintOrDownload('download')}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportPreviewDialog;