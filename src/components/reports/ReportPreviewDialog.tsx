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
import { Label } from "@/components/ui/label";
import { Printer, Download, Save } from "lucide-react";
import { showError } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn, getPrintStyles } from "@/lib/utils";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { saveReportToSupabase } from "@/integrations/supabase/report-queries";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeHtml } from "@/utils/sanitize-html";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import { REPORT_PAPER_MM } from "@/lib/report-paper";

export type ReportPageOrientation = "portrait" | "landscape";

function previewPageStyle(
  paperSize: "Letter" | "A4" | "A5" | undefined,
  orientation: ReportPageOrientation
): React.CSSProperties {
  const paper = REPORT_PAPER_MM[paperSize || "A4"];
  const widthMm = orientation === "landscape" ? paper.height : paper.width;
  const heightMm = orientation === "landscape" ? paper.width : paper.height;
  return {
    width: `${widthMm}mm`,
    minHeight: `${heightMm}mm`,
  };
}

interface ReportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportContent: string; // HTML string for the report body
  companyDetails: MockCompanyDetails | null; // Receive companyDetails as prop
  reportDesignSettings: ReportDesignSettings;
  documentType: "payslip" | "report"; // New prop for document type
  periodLabel?: string;
}

const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportContent,
  companyDetails, // Destructure companyDetails
  reportDesignSettings,
  documentType,
  periodLabel,
}) => {
  // Define displayCompanyName within this component's scope
  const displayCompanyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";
  const companyLogoUrl = reportDesignSettings.includeCompanyLogo
    ? resolveCompanyLogoSource(companyDetails?.logoUrl)
    : undefined;
  const logoDims = resolveDocumentLogoDimensions(
    companyDetails?.logoWidth,
    companyDetails?.logoHeight,
    companyDetails?.logoFit
  );
  const physicalAddress = companyDetails?.physicalAddress;
  const companyRegistrationNumber = companyDetails?.companyRegistrationNumber;
  const vatRegistrationNumber = companyDetails?.vatRegistrationNumber;
  const mainContactNumber = companyDetails?.mainContactNumber;
  const companyEmail = companyDetails?.companyEmail;
  const companyWebsite = companyDetails?.companyWebsite;

  const { isMockDataEnabled } = usePayrollProcessor(); // Get isMockDataEnabled from usePayrollProcessor
  const { user } = useAuth(); // Get user from useAuth

  const [orientation, setOrientation] = React.useState<ReportPageOrientation>("portrait");

  React.useEffect(() => {
    if (!isOpen) return;
    // Wide checklist tables read better in landscape by default.
    setOrientation(/readiness/i.test(reportTitle) ? "landscape" : "portrait");
  }, [isOpen, reportTitle]);

  // Get explicit print styles for the preview display
  const previewStyles = getPrintStyles(reportDesignSettings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(previewStyles.fontSize?.toString() || "14px");
  const pageBoxStyle = previewPageStyle(reportDesignSettings.defaultReportPaperSize, orientation);

  const { downloadPdf, openPdf } = usePdfVector();

  // Sanitize report content before rendering
  const sanitizedReportContent = React.useMemo(() => sanitizeHtml(reportContent), [reportContent]);

  const handlePrintOrDownload = async (action: "print" | "download") => {
    const { default: HtmlReportPdfDocument } = await import(
      "@/components/reports/HtmlReportPdfDocument"
    );
    const doc = (
      <HtmlReportPdfDocument
        reportTitle={reportTitle}
        reportContentHtml={sanitizedReportContent}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        orientation={orientation}
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
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-full flex-col",
          orientation === "landscape" ? "sm:max-w-[1100px]" : "sm:max-w-[800px]"
        )}
      >
        <DialogHeader>
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>
            {periodLabel ? `Period: ${periodLabel}. ` : ""}
            Choose page orientation, then preview, print, download PDF, or save to Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="report-orientation" className="text-sm font-medium">
              Page orientation
            </Label>
            <p className="text-xs text-muted-foreground">
              Applies to print and PDF download. Landscape suits wide tables.
            </p>
          </div>
          <ToggleGroup
            id="report-orientation"
            type="single"
            value={orientation}
            onValueChange={(value) => {
              if (value === "portrait" || value === "landscape") setOrientation(value);
            }}
            variant="outline"
            className="justify-start"
          >
            <ToggleGroupItem value="portrait" aria-label="Portrait orientation" className="px-4">
              Portrait
            </ToggleGroupItem>
            <ToggleGroupItem value="landscape" aria-label="Landscape orientation" className="px-4">
              Landscape
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <ScrollArea className="flex-grow pr-4">
          <div
            className="mx-auto max-w-full rounded-lg bg-white text-gray-900 shadow-lg"
            style={{
              ...pageBoxStyle,
              padding: "24px",
              fontSize: previewStyles.fontSize,
              border: "1px solid #ccc",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          >
            {(reportDesignSettings.includeCompanyLogo && companyLogoUrl) ||
            reportDesignSettings.includeCompanyDetails ? (
              <div className="mb-6 flex items-start justify-between print:mb-8">
                {reportDesignSettings.includeCompanyLogo && companyLogoUrl && (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    style={{ width: logoDims.width, height: logoDims.height, objectFit: logoDims.fit }}
                    className="flex-shrink-0 rounded-md print:h-[60px] print:w-[60px]"
                  />
                )}
                {reportDesignSettings.includeCompanyDetails && (
                  <div
                    className="w-full text-right text-[13px] print:text-[13px]"
                    style={{ fontSize: `${baseFontSizePx * 0.9}px` }}
                  >
                    <h2
                      className="text-md font-bold print:text-lg"
                      style={{ fontSize: `${baseFontSizePx * 1.2}px` }}
                    >
                      {displayCompanyName}
                    </h2>
                    {companyDetails?.companyTradingName &&
                      companyDetails?.companyTradingName !== companyDetails?.companyLegalName && (
                        <p
                          className="text-[13px] print:text-[13px]"
                          style={{ fontSize: `${baseFontSizePx * 1}px` }}
                        >
                          {companyDetails?.companyTradingName}
                        </p>
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

            <Separator
              className="my-4 print:my-4"
              style={{ margin: `${baseFontSizePx * 1}px 0` }}
            />

            <h3
              className="mb-4 text-center text-lg font-bold print:mb-6 print:text-xl"
              style={{ fontSize: `${baseFontSizePx * 1.3}px`, marginBottom: `${baseFontSizePx * 1}px` }}
            >
              {reportTitle}
            </h3>

            <div
              dangerouslySetInnerHTML={{ __html: sanitizedReportContent }}
              style={{ fontSize: `${reportDesignSettings.reportContentFontSize}px` }}
            />
          </div>
        </ScrollArea>
        <DialogFooter className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handlePrintOrDownload("print")}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
          <Button onClick={() => handlePrintOrDownload("download")}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveToSupabase}
            disabled={isMockDataEnabled || !user?.id}
          >
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
