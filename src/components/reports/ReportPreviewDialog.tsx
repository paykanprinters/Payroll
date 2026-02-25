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
import { Printer, Download, Save } from "lucide-react";
import { showError } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getPrintStyles } from "@/lib/utils";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { saveReportToSupabase } from "@/integrations/supabase/report-queries";
import { useAuth } from "@/context/AuthContext";
import { sanitizeHtml } from "@/utils/sanitize-html";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import HtmlReportPdfDocument from "@/components/reports/HtmlReportPdfDocument";

interface ReportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportContent: string; // HTML string for the report body
  companyDetails: MockCompanyDetails | null; // Receive companyDetails as prop
  reportDesignSettings: ReportDesignSettings;
  documentType: 'payslip' | 'report'; // New prop for document type
}

const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportContent,
  companyDetails, // Destructure companyDetails
  reportDesignSettings,
  documentType,
}) => {
  // Define displayCompanyName within this component's scope
  const displayCompanyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";
  const companyLogoUrl = companyDetails?.logoUrl;
  const companyLogoWidth = companyDetails?.logoWidth || 100;
  const companyLogoHeight = companyDetails?.logoHeight || 50;
  const companyLogoFit = companyDetails?.logoFit || "contain";
  const physicalAddress = companyDetails?.physicalAddress;
  const companyRegistrationNumber = companyDetails?.companyRegistrationNumber;
  const vatRegistrationNumber = companyDetails?.vatRegistrationNumber;
  const mainContactNumber = companyDetails?.mainContactNumber;
  const companyEmail = companyDetails?.companyEmail;
  const companyWebsite = companyDetails?.companyWebsite;

  const { isMockDataEnabled } = usePayrollProcessor(); // Get isMockDataEnabled from usePayrollProcessor
  const { user } = useAuth(); // Get user from useAuth

  // Get explicit print styles for the preview display
  const previewStyles = getPrintStyles(reportDesignSettings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(previewStyles.fontSize?.toString() || "14px");

  const { downloadPdf, openPdf } = usePdfVector();

  // Sanitize report content before rendering
  const sanitizedReportContent = React.useMemo(() => sanitizeHtml(reportContent), [reportContent]);

  const handlePrintOrDownload = async (action: "print" | "download") => {
    const doc = (
      <HtmlReportPdfDocument
        reportTitle={reportTitle}
        reportContentHtml={sanitizedReportContent}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
      />
    );

    const filename = `${reportTitle.replace(/\s/g, "-")}.pdf`;

    if (action === "download") {
      await downloadPdf(doc, filename);
    } else {
      // Open vector PDF in a new tab; user prints from the browser PDF viewer
      await openPdf(doc, reportTitle);
    }
  };

  const handleSaveToSupabase = async () => {
    if (isMockDataEnabled) {
      showError("Cannot save reports to Supabase when mock data is enabled.");
      return;
    }
    if (!user?.id) {
      showError("User not authenticated. Cannot save report.");
      return;
    }

    await saveReportToSupabase({
      user_id: user.id,
      report_title: reportTitle,
      report_type: documentType,
      content_html: reportContent,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>Preview and manage your report.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          <div
            className={cn(
              "bg-white text-gray-900 mx-auto rounded-lg shadow-lg max-w-full",
              reportDesignSettings.defaultReportPaperSize === "Letter"
                ? "w-letter min-h-letter"
                : reportDesignSettings.defaultReportPaperSize === "A5"
                  ? "w-a5 min-h-a5"
                  : "w-a4 min-h-a4"
            )}
            style={{
              padding: "24px",
              fontSize: previewStyles.fontSize,
              border: "1px solid #ccc",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          >
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
                    {companyDetails?.companyTradingName && companyDetails?.companyTradingName !== companyDetails?.companyLegalName && (
                      <p className="text-[13px] print:text-[13px]" style={{ fontSize: `${baseFontSizePx * 1}px` }}>{companyDetails?.companyTradingName}</p>
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

            <div
              dangerouslySetInnerHTML={{ __html: sanitizedReportContent }}
              style={{ fontSize: `${reportDesignSettings.reportContentFontSize}px` }}
            />
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => handlePrintOrDownload("print")}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
          <Button onClick={() => handlePrintOrDownload("download")}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={handleSaveToSupabase} disabled={isMockDataEnabled || !user?.id}>
            <Save className="mr-2 h-4 w-4" /> Save to Supabase
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