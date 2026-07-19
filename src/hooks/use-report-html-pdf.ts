"use client";

import { useCallback } from "react";
import { dismissToast, showError, showLoading, showSuccess } from "@/utils/toast";
import {
  downloadReportHtmlPdf,
  downloadSuccessMessage,
  openReportHtmlPdf,
  type ReportHtmlPdfOptions,
} from "@/lib/report-html-pdf-client";

/**
 * Chromium HTML→PDF for catalog reports (matches on-screen report chrome).
 */
export function useReportHtmlPdf() {
  const downloadReportPdf = useCallback(async (options: ReportHtmlPdfOptions) => {
    const toastId = showLoading(`Preparing ${options.filename} (print PDF)…`) as string;
    try {
      const mode = await downloadReportHtmlPdf(options);
      if (mode === "api") {
        showSuccess(downloadSuccessMessage(options.filename, "web-anchor"));
      } else {
        showSuccess(
          "Opened the print dialog. Choose “Save as PDF” as the destination for a faithful copy."
        );
      }
    } catch (err) {
      showError(`Report PDF failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      throw err;
    } finally {
      dismissToast(toastId);
    }
  }, []);

  const openReportPdf = useCallback(
    async (options: Omit<ReportHtmlPdfOptions, "filename"> & { title: string }) => {
      const toastId = showLoading(`Opening ${options.title} (print PDF)…`) as string;
      try {
        const mode = await openReportHtmlPdf(options);
        if (mode === "api") {
          showSuccess(`${options.title} opened in a new tab.`);
        } else {
          showSuccess(
            "Opened the browser print view. Use Print or Save as PDF for a layout-faithful copy."
          );
        }
      } catch (err) {
        showError(`Report PDF open failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        throw err;
      } finally {
        dismissToast(toastId);
      }
    },
    []
  );

  return { downloadReportPdf, openReportPdf };
}
