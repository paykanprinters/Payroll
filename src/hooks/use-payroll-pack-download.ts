"use client";

import { useCallback, useState } from "react";
import { buildPayrollPackItems } from "@/lib/payroll-pack";
import type { ReportGenerateContext } from "@/lib/report-catalog";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { useReportHtmlPdf } from "@/hooks/use-report-html-pdf";
import { showError, showSuccess } from "@/utils/toast";
import { sanitizeHtml } from "@/utils/sanitize-html";

/**
 * Sequentially download stakeholder payroll pack PDFs (readiness, bank transfer, EMP201)
 * via Chromium HTML→PDF so layout matches report preview.
 */
export function usePayrollPackDownload() {
  const { downloadReportPdf } = useReportHtmlPdf();
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadPayrollPack = useCallback(
    async (options: {
      ctx: ReportGenerateContext;
      periodLabel: string;
      companyDetails: MockCompanyDetails | null;
      reportDesignSettings: ReportDesignSettings;
    }) => {
      const items = buildPayrollPackItems({
        ctx: options.ctx,
        periodLabel: options.periodLabel,
      });

      if (items.length === 0) {
        showError("No payroll pack reports are available for this period.");
        return;
      }

      setIsDownloading(true);
      try {
        for (const item of items) {
          await downloadReportPdf({
            reportTitle: item.title,
            reportContentHtml: sanitizeHtml(item.html),
            companyDetails: options.companyDetails,
            reportDesignSettings: options.reportDesignSettings,
            orientation: item.orientation,
            filename: item.filename,
          });
        }

        showSuccess(`Downloaded ${items.length} payroll pack PDF(s) for ${options.periodLabel}.`);
      } catch (err) {
        showError(
          `Payroll pack download failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsDownloading(false);
      }
    },
    [downloadReportPdf]
  );

  return { downloadPayrollPack, isDownloading };
}
