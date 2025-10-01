"use client";

import React from "react";
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
import { cn, getPrintClasses } from "@/lib/utils";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

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
  companyLogoSize: number;
  reportDesignSettings: ReportDesignSettings; // Prop for report design settings
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
  companyLogoSize,
  reportDesignSettings, // Destructure reportDesignSettings
}) => {
  const handlePrintReport = () => {
    const reportElement = document.getElementById("report-preview-content");
    if (reportElement) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>' + reportTitle + '</title>');

        // Copy all stylesheets and style tags from the current document's head
        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
          .map(node => node.outerHTML)
          .join('');
        printWindow.document.write(stylesheets);

        printWindow.document.write('<style>');
        printWindow.document.write('@media print { body { margin: 0; } .no-print { display: none; } }');
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(reportElement.outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        showSuccess("Report sent to printer.");
      } else {
        showError("Could not open print window.");
      }
    } else {
      showError("Report content not found for printing.");
    }
  };

  const handleDownloadPdf = () => {
    const reportElement = document.getElementById("report-preview-content");
    if (reportElement) {
      showSuccess("Generating PDF, please wait...");

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (reportDesignSettings.defaultReportPaperSize === 'Letter') pdfFormat = 'letter';
      else if (reportDesignSettings.defaultReportPaperSize === 'A5') pdfFormat = 'a5';

      html2pdf().from(reportElement).set({
        margin: [10, 10, 10, 10],
        filename: `${reportTitle.replace(/\s/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' } // Dynamic format
      }).save();
    } else {
      showError("Report content not found for PDF download.");
    }
  };

  const displayCompanyName = companyLegalName || companyTradingName || "Your Company Name";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>Preview and manage your report.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          <div id="report-preview-content" className={cn(
            "p-4 bg-white text-gray-900 text-[13px]",
            "print:shadow-none print:border print:border-gray-300 print:bg-white print:text-black print:mx-0 print:my-0",
            getPrintClasses(reportDesignSettings.defaultReportPaperSize) // Apply dynamic print classes from report settings
          )}>
            {/* Report Header with Company Details */}
            {(reportDesignSettings.includeCompanyLogo || reportDesignSettings.includeCompanyDetails) && (
              <div className="flex justify-between items-start mb-6 print:mb-8">
                {reportDesignSettings.includeCompanyLogo && companyLogoUrl && (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
                    className="rounded-md flex-shrink-0 print:w-[60px] print:h-[60px]"
                  />
                )}
                {reportDesignSettings.includeCompanyDetails && (
                  <div className={cn("text-right text-[13px] print:text-[13px]", !reportDesignSettings.includeCompanyLogo && "w-full")}>
                    <h2 className="text-md font-bold print:text-lg">{displayCompanyName}</h2>
                    {companyTradingName && companyTradingName !== companyLegalName && (
                      <p className="text-[13px] print:text-[13px]">{companyTradingName}</p>
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
            )}

            <Separator className="my-4 print:my-4" />

            <h3 className="text-lg font-bold text-center mb-4 print:text-xl print:mb-6">{reportTitle}</h3>

            {/* Report Content */}
            <div
              dangerouslySetInnerHTML={{ __html: reportContent }}
              style={{ fontSize: `${reportDesignSettings.reportContentFontSize}px` }} // Apply dynamic font size
            />
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
          <Button onClick={handleDownloadPdf}>
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