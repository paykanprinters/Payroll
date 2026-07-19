"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
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
import {
  fitPaperScaleToWidth,
  getOrientedPaperMm,
  getReportPaper,
  type ReportPageOrientation,
} from "@/lib/report-paper";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";

export type { ReportPageOrientation };

const SIZE_EPSILON_PX = 2;
const SCALE_EPSILON = 0.005;

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(0);
  const [scale, setScale] = useState(0.5);
  const [footprintHeightPx, setFootprintHeightPx] = useState(400);

  const paperMeta = getReportPaper(reportDesignSettings.defaultReportPaperSize);
  const oriented = getOrientedPaperMm(reportDesignSettings.defaultReportPaperSize, orientation);

  React.useEffect(() => {
    if (!isOpen) return;
    setOrientation(/readiness/i.test(reportTitle) ? "landscape" : "portrait");
  }, [isOpen, reportTitle]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = viewportRef.current;
    if (!el) return;

    const applyWidth = (width: number) => {
      const w = Math.round(width);
      if (w < 1) return;
      if (Math.abs(w - lastWidthRef.current) < SIZE_EPSILON_PX) return;
      lastWidthRef.current = w;
      const next = fitPaperScaleToWidth(oriented.width, w, 24);
      setScale((current) => (Math.abs(current - next) < SCALE_EPSILON ? current : next));
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applyWidth(entry.contentRect.width);
    });
    ro.observe(el);
    applyWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [isOpen, oriented.width]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const page = pageRef.current;
    if (!page) return;

    const measure = () => {
      const layoutH = page.offsetHeight;
      setFootprintHeightPx(Math.max(120, Math.round(layoutH * scale)));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(page);
    return () => ro.disconnect();
  }, [isOpen, scale, orientation, reportContent, reportDesignSettings, companyDetails, reportTitle]);

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

  const scaledWidthMm = oriented.width * scale;

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
            Scaled print-page preview. Print / Download use Chromium HTML→PDF so the file matches
            this layout (square page edges — not the dialog frame).
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="report-orientation" className="text-sm font-medium">
              Page orientation
            </Label>
            <p className="text-xs text-muted-foreground">
              Applies to this preview and to print / PDF. Landscape suits wide tables.
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

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {paperMeta.label} · {orientation} · {oriented.width.toFixed(0)}×
            {oriented.height.toFixed(0)} mm · {Math.round(scale * 100)}% scale
          </span>
          <span>Scroll for multi-page length</span>
        </div>

        <div
          ref={viewportRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto border bg-[linear-gradient(135deg,#e8ecf1_0%,#f4f6f8_50%,#e5e9ef_100%)] p-3 [scrollbar-gutter:stable]"
        >
          <div
            className="relative mx-auto"
            style={{
              width: `${scaledWidthMm}mm`,
              height: `${footprintHeightPx}px`,
            }}
          >
            <div
              ref={pageRef}
              className="origin-top-left"
              style={{
                width: `${oriented.width}mm`,
                transform: `scale(${scale})`,
              }}
            >
              <ReportContentWrapper
                reportTitle={reportTitle}
                reportContent={sanitizedReportContent}
                companyDetails={companyDetails}
                reportDesignSettings={reportDesignSettings}
                constrainToParent={false}
                pageOrientation={orientation}
                chrome="sheet"
              />
            </div>
          </div>
        </div>

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
