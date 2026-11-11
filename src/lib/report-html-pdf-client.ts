/**
 * Chromium-faithful report PDF helpers.
 *
 * 1) Prefer POST /api/render-report-pdf
 *    - Local: Vite Playwright middleware
 *    - Production: Vercel Serverless Function (@sparticuz/chromium + puppeteer-core)
 * 2) Fall back to the browser print engine with the same HTML document
 *    (Chrome/Edge → Destination: Save as PDF) if the API is unavailable.
 */
import { supabase } from "@/integrations/supabase/client";
import { downloadBlob, downloadSuccessMessage } from "@/lib/native-blob-download";
import {
  buildReportPrintDocumentHtml,
  type BuildReportPrintDocumentInput,
} from "@/lib/report-print-html";
import type { ReportPageOrientation } from "@/lib/report-paper";

export type ReportHtmlPdfOptions = BuildReportPrintDocumentInput & {
  filename: string;
};

async function postRenderPdf(html: string, paperSize: string, orientation: ReportPageOrientation): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch("/api/render-report-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      html,
      paperSize,
      orientation,
    }),
  });

  if (!res.ok) {
    let message = `PDF service returned ${res.status}`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) message = json.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/pdf")) {
    throw new Error("PDF service did not return a PDF (is the Chromium API running?)");
  }

  return res.blob();
}

/** Open the print-faithful HTML in a new window and invoke the browser print dialog. */
export function printReportHtmlDocument(html: string, title: string): void {
  try {
    sessionStorage.setItem("suppressAppFocusRefreshUntil", String(Date.now() + 2 * 60 * 1000));
  } catch {
    // ignore
  }

  const w = window.open("", "_blank");
  if (!w) {
    throw new Error("Popup blocked — allow popups to print the report.");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  // Wait a tick for images/layout before printing.
  w.focus();
  setTimeout(() => {
    w.print();
  }, 350);
}

export async function downloadReportHtmlPdf(options: ReportHtmlPdfOptions): Promise<"api" | "print-fallback"> {
  const orientation = options.orientation ?? "portrait";
  const html = buildReportPrintDocumentHtml(options);
  const paperSize = options.reportDesignSettings.defaultReportPaperSize;

  try {
    const blob = await postRenderPdf(html, paperSize, orientation);
    await downloadBlob(blob, options.filename, "application/pdf");
    return "api";
  } catch {
    // Chromium API unavailable (local without browsers, cold fail, etc.)
    printReportHtmlDocument(html, options.reportTitle);
    return "print-fallback";
  }
}

export async function openReportHtmlPdf(options: Omit<ReportHtmlPdfOptions, "filename"> & { title: string }): Promise<"api" | "print-fallback"> {
  const orientation = options.orientation ?? "portrait";
  const html = buildReportPrintDocumentHtml(options);
  const paperSize = options.reportDesignSettings.defaultReportPaperSize;

  try {
    sessionStorage.setItem("suppressAppFocusRefreshUntil", String(Date.now() + 2 * 60 * 1000));
  } catch {
    // ignore
  }

  try {
    const blob = await postRenderPdf(html, paperSize, orientation);
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      window.open(url, "_blank");
    }
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
    return "api";
  } catch {
    printReportHtmlDocument(html, options.title);
    return "print-fallback";
  }
}

export { downloadSuccessMessage };
