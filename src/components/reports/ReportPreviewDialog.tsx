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
  reportDesignSettings,
}) => {
  const companyDetails: MockCompanyDetails = {
    companyLegalName, companyTradingName, companyRegistrationNumber,
    companyTaxNumber: "", // Not used in report header, but required by interface
    vatRegistrationNumber, industry: "", // Not used in report header
    payeReferenceNumber: "", uifReferenceNumber: "", sdlReferenceNumber: "", coidaRegistrationNumber: "", // Not used
    physicalAddress, postalAddress: "", mainContactNumber, alternativeContactNumber: "",
    companyEmail, companyWebsite, bankName: "", accountHolderName: "", accountNumber: "",
    branchCode: "", accountType: "Cheque", logoUrl: companyLogoUrl || "", logoSize: companyLogoSize,
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

  const getMinHeightForFormat = (format: 'Letter' | 'A4' | 'A5' | undefined) => {
    switch (format) {
      case 'Letter': return '279.4mm'; // 11 inches
      case 'A5': return '210mm';
      case 'A4':
      default: return '297mm';
    }
  };

  const generateReportElementForPdf = (): Promise<HTMLIFrameElement> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px'; // Position off-screen
      iframe.style.top = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden'; // Ensure it's hidden
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        reject(new Error("Could not access iframe document."));
        return;
      }

      iframeDoc.open();
      iframeDoc.write('<!DOCTYPE html><html><head><title>Report</title></head><body><div id="report-root"></div></body></html>');
      iframeDoc.close();

      // Copy all stylesheets and style tags from the main document to the iframe
      Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
        const clonedNode = node.cloneNode(true);
        iframeDoc.head.appendChild(clonedNode);
      });

      // Inject custom CSS for PDF styling
      const style = iframeDoc.createElement('style');
      const minHeight = getMinHeightForFormat(reportDesignSettings.defaultReportPaperSize);
      style.textContent = `
        @page {
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #report-root {
          background-color: white;
        }
        #report-root > div { /* The ReportContentWrapper */
          box-sizing: border-box;
          border: 1px solid black; /* RESTORED BORDER for reports */
          padding: 10mm; /* Internal padding for content */
          min-height: ${minHeight}; /* Dynamic min-height */
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: stretch;
        }
        #report-root table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto; /* Allow tables to break across pages */
        }
        #report-root table thead {
          display: table-header-group; /* Repeat table headers on new pages */
        }
        #report-root table tr {
          page-break-inside: auto; /* Allow table rows to break across pages */
          page-break-before: auto;
          page-break-after: auto;
        }
        #report-root table th, #report-root table td {
          padding: 8px; /* Consistent padding for cells */
          border-bottom: 1px solid #eee; /* Light border for rows */
          vertical-align: top; /* Align content to top */
        }
        #report-root table tr.border-b:last-child td {
          border-bottom: none; /* Remove bottom border for last row if it has border-b class */
        }
        #report-root h1, #report-root h2, #report-root h3, #report-root h4, #report-root h5, #report-root h6 {
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        #report-root p {
          page-break-inside: avoid;
        }
        #report-root hr {
          page-break-after: avoid;
          page-break-before: avoid;
        }
      `;
      iframeDoc.head.appendChild(style);


      const reportRoot = iframeDoc.getElementById('report-root');
      if (!reportRoot) {
        reject(new Error("Report root element not found in iframe."));
        return;
      }

      const root = ReactDOM.createRoot(reportRoot);
      root.render(
        <ReportContentWrapper
          reportTitle={reportTitle}
          reportContent={reportContent}
          companyDetails={companyDetails}
          reportDesignSettings={reportDesignSettings}
          onReadyForPdf={() => {
            console.log("ReportContentWrapper signaled readiness in iframe.");
            resolve(iframe);
          }}
        />
      );

      // Store the root for cleanup
      (iframe as any)._reactRoot = root;

      // Fallback if onReadyForPdf doesn't fire (e.g., no images, or component renders very fast)
      const timeoutId = setTimeout(() => {
        console.warn("Report iframe readiness timed out, proceeding with PDF generation.");
        resolve(iframe);
      }, 3000); // Increased delay for iframe content to settle

      // Clear timeout if resolved earlier
      iframe.onload = () => clearTimeout(timeoutId);
    });
  };

  const cleanupReportElementForPdf = (iframe: HTMLIFrameElement) => {
    const root = (iframe as any)._reactRoot;
    if (root) {
      root.unmount();
    }
    document.body.removeChild(iframe);
  };

  const handlePrintOrDownload = async (action: 'print' | 'download') => {
    showSuccess(`Generating PDF for ${action}, please wait...`);

    let iframe: HTMLIFrameElement | null = null;
    try {
      iframe = await generateReportElementForPdf();
      const reportElement = iframe.contentWindow?.document.getElementById('report-root');

      if (!reportElement) {
        throw new Error("Report root element not found in iframe for capture.");
      }

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (reportDesignSettings.defaultReportPaperSize === 'Letter') pdfFormat = 'letter';
      else if (reportDesignSettings.defaultReportPaperSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [0, 0, 0, 0] as [number, number, number, number], // Set margin to 0, CSS handles padding/border
        filename: `${reportTitle.replace(/\s/g, '-')}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(reportElement).set(opt);

      if (action === 'download') {
        await pdfPromise.save();
        showSuccess("Report PDF downloaded successfully!");
      } else { // 'print'
        const pdf = await pdfPromise.toPdf().get('pdf');
        pdf.output('dataurlnewwindow');
        showSuccess("Report sent to printer.");
      }
    } catch (error: any) {
      showError(`Error generating PDF for ${action}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf ${action} error:`, error);
    } finally {
      if (iframe) {
        cleanupReportElementForPdf(iframe);
      }
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
            "p-4 bg-white text-gray-900 text-[13px] mx-auto rounded-lg shadow-lg", // Added rounded-lg and shadow-lg for UI preview
            getPreviewPageClasses(reportDesignSettings.defaultReportPaperSize), // Apply width/min-height classes
          )}
          style={{
            ...previewStyles, // Apply all styles from getPrintStyles
            fontSize: `${reportDesignSettings.reportContentFontSize}px`, // Override font size
            border: '1px solid #ccc', // Lighter border for UI preview
          }}
          >
            {/* Report Header with Company Details */}
            {(reportDesignSettings.includeCompanyLogo && companyLogoUrl) || reportDesignSettings.includeCompanyDetails ? (
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