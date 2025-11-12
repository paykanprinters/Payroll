"use client";

import React, { useCallback } from "react";
import ReactDOM from "react-dom/client";
import html2pdf from "html2pdf.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

interface PdfOptions {
  filename: string;
  format?: "a4" | "letter" | "a5";
  orientation?: "portrait" | "landscape";
  margin?: number | [number, number, number, number];
  documentType?: "payslip" | "report";
}

interface RenderComponentProps {
  onReadyForPdf?: () => void;
  isPdfGeneration?: boolean;
}

/* ---------- Dimension helpers ---------- */

const mmToPx = (mm: number) => Math.round(mm * 3.7795);

const getPageWidthMm = (
  format: "a4" | "letter" | "a5" | undefined,
  orientation: "portrait" | "landscape" | undefined
) => {
  let widthMm = 210;
  let heightMm = 297;
  if (format === "letter") {
    widthMm = 215.9;
    heightMm = 279.4;
  }
  if (format === "a5") {
    widthMm = 148;
    heightMm = 210;
  }
  const isLandscape = orientation === "landscape";
  return isLandscape ? heightMm : widthMm;
};

const getPageHeightMm = (
  format: "a4" | "letter" | "a5" | undefined,
  orientation: "portrait" | "landscape" | undefined
) => {
  let widthMm = 210;
  let heightMm = 297;
  if (format === "letter") {
    widthMm = 215.9;
    heightMm = 279.4;
  }
  if (format === "a5") {
    widthMm = 148;
    heightMm = 210;
  }
  const isLandscape = orientation === "landscape";
  return isLandscape ? widthMm : heightMm;
};

const computeDimensions = (options: PdfOptions) => {
  const pageWidthMm = getPageWidthMm(options.format, options.orientation);
  const pageHeightMm = getPageHeightMm(options.format, options.orientation);
  const contentMarginMm = 10;
  const contentWidthMm = pageWidthMm - contentMarginMm * 2;
  const contentHeightMm = pageHeightMm - contentMarginMm * 2;
  return { pageWidthMm, pageHeightMm, contentMarginMm, contentWidthMm, contentHeightMm };
};

/* ---------- Styles and iframe helpers ---------- */

const buildStyles = (contentWidthMm: number, contentMarginMm: number) => `
  @page { margin: 0; }
  body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #fff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.35;
  }
  #pdf-root { background-color: white; }
  #pdf-root > div {
    box-sizing: border-box;
    width: ${contentWidthMm}mm;
    margin: 0 auto;
    padding: ${contentMarginMm}mm;
    display: block;
  }
  #pdf-root table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  #pdf-root table thead { display: table-header-group; }
  #pdf-root table tr { page-break-inside: auto; }
  #pdf-root table th, #pdf-root table td { padding: 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  #pdf-root table tr.border-b:last-child td { border-bottom: none; }
  #pdf-root h1, #pdf-root h2, #pdf-root h3, #pdf-root h4, #pdf-root h5, #pdf-root h6 { page-break-after: avoid; page-break-inside: avoid; }
  #pdf-root p { page-break-inside: avoid; }
  #pdf-root hr { page-break-after: avoid; page-break-before: avoid; }
  .html2pdf__page-break { break-before: page; page-break-before: always; }
  .pdf-page { page-break-inside: avoid; }
`;

const createHiddenIframe = () => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || null;
  return { iframe, iframeDoc };
};

const initIframeDocument = (iframeDoc: Document, title: string) => {
  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="pdf-root"></div></body></html>`);
  iframeDoc.close();

  // Copy styles from parent into iframe
  Array.from(document.querySelectorAll("link[rel='stylesheet'], style")).forEach((node) => {
    const clonedNode = node.cloneNode(true);
    iframeDoc.head.appendChild(clonedNode);
  });
};

const injectPrintStyles = (iframeDoc: Document, css: string) => {
  const styleEl = iframeDoc.createElement("style");
  styleEl.textContent = css;
  iframeDoc.head.appendChild(styleEl);
};

const mountReactInIframe = (
  iframeDoc: Document,
  renderComponent: (props: RenderComponentProps) => React.ReactElement
) => {
  const pdfRoot = iframeDoc.getElementById("pdf-root");
  if (!pdfRoot) throw new Error("PDF root element not found in iframe.");

  const root = ReactDOM.createRoot(pdfRoot);
  (iframeDoc.defaultView as any)._reactRoot = root;

  let resolveReady!: () => void;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  root.render(
    renderComponent({
      onReadyForPdf: () => resolveReady(),
      isPdfGeneration: true,
    })
  );

  const timeoutId = setTimeout(() => resolveReady(), 5000);
  return { root, readyPromise, timeoutId };
};

const cleanup = (iframe: HTMLIFrameElement, root: ReactDOM.Root | null) => {
  if (root) root.unmount();
  if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
};

/* ---------- html2pdf options and borders ---------- */

const getHtml2PdfOptions = (
  contentWidthMm: number,
  contentMarginMm: number,
  options: PdfOptions,
  scaleOverride?: number
) => {
  return {
    margin: [contentMarginMm, contentMarginMm, contentMarginMm, contentMarginMm] as [number, number, number, number],
    filename: options.filename,
    image: { type: "jpeg" as "jpeg", quality: 0.92 },
    html2canvas: {
      scale: scaleOverride ?? 2,
      logging: false,
      useCORS: true,
      windowWidth: mmToPx(contentWidthMm),
      scrollY: 0,
    },
    pagebreak: { mode: ["css", "legacy"] as any },
    jsPDF: {
      unit: "mm",
      format: options.format || "a4",
      orientation: (options.orientation || "portrait") as "portrait",
    },
  };
};

const drawBordersForAllPages = (pdf: jsPDF, documentType: PdfOptions["documentType"]) => {
  const borderOffset = 10;
  const borderColor = "#000000";
  const borderWidth = 0.5;

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const rectX = borderOffset;
    const rectY = borderOffset;
    const rectWidth = pageW - 2 * borderOffset;
    const rectHeight = pageH - 2 * borderOffset;
    pdf.setDrawColor(borderColor);
    pdf.setLineWidth(borderWidth);
    if (documentType === "payslip") {
      pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, "S");
    } else {
      pdf.rect(rectX, rectY, rectWidth, rectHeight, "S");
    }
  }
};

const drawBorderOnCurrentPage = (pdf: jsPDF, documentType: PdfOptions["documentType"]) => {
  const borderOffset = 10;
  const borderColor = "#000000";
  const borderWidth = 0.5;

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const rectX = borderOffset;
  const rectY = borderOffset;
  const rectWidth = pageW - 2 * borderOffset;
  const rectHeight = pageH - 2 * borderOffset;
  pdf.setDrawColor(borderColor);
  pdf.setLineWidth(borderWidth);
  if (documentType === "payslip") {
    pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, "S");
  } else {
    pdf.rect(rectX, rectY, rectWidth, rectHeight, "S");
  }
};

/* ---------- Bulk page-by-page rendering ---------- */

const renderBulkAsPages = async (
  iframeDoc: Document,
  dims: ReturnType<typeof computeDimensions>,
  options: PdfOptions
) => {
  const pdf = new jsPDF({
    unit: "mm",
    format: options.format || "a4",
    orientation: (options.orientation || "portrait") as "portrait",
  });

  const { contentWidthMm, contentHeightMm, contentMarginMm } = dims;
  const viewportWidthPx = mmToPx(contentWidthMm);

  const pageBlocks = Array.from(iframeDoc.querySelectorAll(".pdf-page")) as HTMLElement[];
  if (pageBlocks.length === 0) return null;

  for (let i = 0; i < pageBlocks.length; i++) {
    const block = pageBlocks[i];

    // Dynamically lower scale for very tall pages to avoid exceeding browser canvas limits
    const blockHeightPx = block.offsetHeight;
    const baseScale = 2;
    const MAX_CANVAS_DIM = 4096; // conservative safety cap for max canvas dimension
    const dynamicScale = Math.min(baseScale, MAX_CANVAS_DIM / Math.max(blockHeightPx, viewportWidthPx));

    const canvas = await html2canvas(block, {
      scale: dynamicScale,
      logging: false,
      useCORS: true,
      windowWidth: viewportWidthPx,
      scrollY: 0,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgWidthMm = contentWidthMm;
    const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm;

    // Fit within inner height if block is taller
    const maxInnerHeightMm = contentHeightMm;
    const scaleRatio = Math.min(1, maxInnerHeightMm / imgHeightMm);
    const finalWidthMm = imgWidthMm * scaleRatio;
    const finalHeightMm = imgHeightMm * scaleRatio;

    if (i > 0) {
      pdf.addPage(options.format || "a4", options.orientation || "portrait");
    }

    pdf.addImage(imgData, "JPEG", contentMarginMm, contentMarginMm, finalWidthMm, finalHeightMm, undefined, "FAST");
    drawBorderOnCurrentPage(pdf, options.documentType);
  }

  return pdf;
};

/* ---------- Public hook API ---------- */

export const usePdfGenerator = () => {
  const generatePdf = useCallback(
    async (
      renderComponent: (props: RenderComponentProps) => React.ReactElement,
      options: PdfOptions,
      isBulk: boolean = false
    ) => {
      const toastId = showLoading(`Generating PDF for ${options.filename}, please wait...`) as string;

      const { iframe, iframeDoc } = createHiddenIframe();
      if (!iframeDoc) {
        dismissToast(toastId);
        showError("Could not access iframe document for PDF generation.");
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        return;
      }

      try {
        initIframeDocument(iframeDoc, "PDF Content");

        const dims = computeDimensions(options);
        injectPrintStyles(iframeDoc, buildStyles(dims.contentWidthMm, dims.contentMarginMm));

        const { root, readyPromise, timeoutId } = mountReactInIframe(iframeDoc, renderComponent);

        try {
          await readyPromise;
        } finally {
          clearTimeout(timeoutId);
        }

        // Bulk-safe path: render each page block individually to avoid oversized canvases
        if (isBulk) {
          const bulkPdf = await renderBulkAsPages(iframeDoc, dims, options);

          if (bulkPdf) {
            drawBordersForAllPages(bulkPdf, options.documentType);
            bulkPdf.save(options.filename);
            showSuccess(`${options.filename} PDF downloaded successfully!`);
            dismissToast(toastId);
            cleanup(iframe, root);
            return;
          }

          // Fallback to html2pdf if no explicit page blocks are found
          const pdf = await html2pdf()
            .from(iframeDoc.getElementById("pdf-root"))
            .set(getHtml2PdfOptions(dims.contentWidthMm, dims.contentMarginMm, options, 1))
            .toPdf()
            .get("pdf");

          drawBordersForAllPages(pdf, options.documentType);
          pdf.save(options.filename);
          showSuccess(`${options.filename} PDF downloaded successfully!`);
          dismissToast(toastId);
          cleanup(iframe, root);
          return;
        }

        // Non-bulk path
        const pdf = await html2pdf()
          .from(iframeDoc.getElementById("pdf-root"))
          .set(getHtml2PdfOptions(dims.contentWidthMm, dims.contentMarginMm, options))
          .toPdf()
          .get("pdf");

        drawBordersForAllPages(pdf, options.documentType);
        pdf.save(options.filename);
        showSuccess(`${options.filename} PDF downloaded successfully!`);
      } catch (error: any) {
        showError(`Error generating PDF for ${options.filename}: ${error.message || "Unknown error"}`);
        console.error(`html2pdf generation error for ${options.filename}:`, error);
        throw error;
      } finally {
        dismissToast(toastId);
        // Best-effort cleanup
        const iframeEl = document.querySelector("iframe[style*='-9999px']") as HTMLIFrameElement | null;
        const root: ReactDOM.Root | null = (iframeDoc?.defaultView as any)?._reactRoot || null;
        if (iframeEl) cleanup(iframeEl, root);
      }
    },
    []
  );

  const printPdf = useCallback(
    async (
      renderComponent: (props: RenderComponentProps) => React.ReactElement,
      options: PdfOptions,
      _isBulk: boolean = false
    ) => {
      const toastId = showLoading(`Preparing ${options.filename} for printing, please wait...`) as string;

      const { iframe, iframeDoc } = createHiddenIframe();
      if (!iframeDoc) {
        dismissToast(toastId);
        showError("Could not access iframe document for printing.");
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        return;
      }

      try {
        initIframeDocument(iframeDoc, "Print Content");

        const dims = computeDimensions(options);
        injectPrintStyles(iframeDoc, buildStyles(dims.contentWidthMm, dims.contentMarginMm));

        const { root, readyPromise, timeoutId } = mountReactInIframe(iframeDoc, renderComponent);

        try {
          await readyPromise;
        } finally {
          clearTimeout(timeoutId);
        }

        const bulkPdf = await renderBulkAsPages(iframeDoc, dims, options);

        if (bulkPdf) {
          drawBordersForAllPages(bulkPdf, options.documentType);
          bulkPdf.output("dataurlnewwindow");
          showSuccess(`${options.filename} sent to printer.`);
        } else {
          const pdf = await html2pdf()
            .from(iframeDoc.getElementById("pdf-root"))
            .set(getHtml2PdfOptions(dims.contentWidthMm, dims.contentMarginMm, options, 1))
            .toPdf()
            .get("pdf");

          drawBordersForAllPages(pdf, options.documentType);
          pdf.output("dataurlnewwindow");
          showSuccess(`${options.filename} sent to printer.`);
        }
      } catch (error: any) {
        showError(`Error preparing ${options.filename} for printing: ${error.message || "Unknown error"}`);
        console.error(`html2pdf print error for ${options.filename}:`, error);
        throw error;
      } finally {
        dismissToast(toastId);
        const iframeEl = document.querySelector("iframe[style*='-9999px']") as HTMLIFrameElement | null;
        const root: ReactDOM.Root | null = (iframeDoc?.defaultView as any)?._reactRoot || null;
        if (iframeEl) cleanup(iframeEl, root);
      }
    },
    []
  );

  return { generatePdf, printPdf };
};