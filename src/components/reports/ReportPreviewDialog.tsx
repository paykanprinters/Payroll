"use client";

import React, { useState } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { saveReportToSupabase } from "@/integrations/supabase/report-queries";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeHtml } from "@/utils/sanitize-html";
import { useReportHtmlPdf } from "@/hooks/use-report-html-pdf";
import type { ReportPageOrientation } from "@/lib/report-paper";
import ReportPagedPreview from "@/components/reports/ReportPagedPreview";

export type { ReportPageOrientation };

interface ReportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportTitle: string;
  reportContent: string;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  documentType: "payslip" | "report";
  periodLabel?: string;
}

const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  isOpen,
  onClose,
  reportTitle,
  reportContent,
  companyDetails,
  reportDesignSettings,
  documentType,
  periodLabel,
}) => {
  const { isMockDataEnabled } = usePayrollProcessor();
  const { user } = useAuth();
  const { downloadReportPdf, openReportPdf } = useReportHtmlPdf();

  const [orientation, setOrientation] = useState<ReportPageOrientation>("portrait");

  React.useEffect(() => {
    if (!isOpen) return;
    setOrientation(/readiness/i.test(reportTitle) ? "landscape" : "portrait");
  }, [isOpen, reportTitle]);

  const sanitizedReportContent = React.useMemo(() => sanitizeHtml(reportContent), [reportContent]);

  const handlePrintOrDownload = async (action: "print" | "download") => {
    const payload = {
      reportTitle,
      reportContentHtml: sanitizedReportContent,
      companyDetails,
      reportDesignSettings,
      orientation,
    };
    const filename = `${reportTitle.replace(/\s/g, "-")}.pdf`;

    if (action === "download") {
      await downloadReportPdf({ ...payload, filename });
    } else {
      await openReportPdf({ ...payload, title: reportTitle });
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
          "flex max-h-[92vh] w-full flex-col gap-3 overflow-hidden",
          orientation === "landscape" ? "sm:max-w-[min(96vw,1200px)]" : "sm:max-w-[min(92vw,860px)]"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1">
          <DialogTitle>{reportTitle}</DialogTitle>
          <DialogDescription>
            {periodLabel ? `Period: ${periodLabel}. ` : ""}
            Content is split into rounded sheets — overflow continues on the next page, matching
            print and PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="report-orientation" className="text-sm font-medium">
              Page orientation
            </Label>
            <p className="text-xs text-muted-foreground">
              Applies to preview, print, and PDF. Landscape suits wide tables.
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

        {isOpen ? (
          <ReportPagedPreview
            reportTitle={reportTitle}
            reportContentHtml={sanitizedReportContent}
            companyDetails={companyDetails}
            reportDesignSettings={reportDesignSettings}
            orientation={orientation}
          />
        ) : null}

        <DialogFooter className="shrink-0 flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => void handlePrintOrDownload("print")}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
          <Button onClick={() => void handlePrintOrDownload("download")}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleSaveToSupabase()}
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
