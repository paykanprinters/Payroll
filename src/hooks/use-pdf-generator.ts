"use client";

import React, { useCallback } from "react";
import ReactDOM from 'react-dom/client';
import html2pdf from 'html2pdf.js';
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { ReportDesignSettings } from "@/lib/report-design-interfaces"; // Import ReportDesignSettings

interface PdfOptions {
  filename: string;
  format?: 'a4' | 'letter' | 'a5';
  orientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number]; // top, left, bottom, right
  documentType?: 'payslip' | 'report'; // New field to distinguish document types
}

interface RenderComponentProps {
  onReadyForPdf?: () => void;
  isPdfGeneration?: boolean; // Add this prop to indicate PDF generation context
}

export const usePdfGenerator = () => {

  const getMinHeightForFormat = (format: 'a4' | 'letter' | 'a5' | undefined) => {
    switch (format) {
      case 'letter': return '279.4mm'; // 11 inches
      case 'a5': return '210mm';
      case 'a4':
      default: return '297mm';
    }
  };

  const generatePdf = useCallback(async (
    renderComponent: (props: RenderComponentProps) => React.ReactElement,
    options: PdfOptions,
    isBulk: boolean = false,
  ) => {
    const toastId = showLoading(`Generating PDF for ${options.filename}, please wait...`) as string;

    // Create a hidden iframe for rendering
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
      dismissToast(toastId);
      showError("Could not access iframe document for PDF generation.");
      iframe.parentNode?.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write('<!DOCTYPE html><html><head><title>PDF Content</title></head><body><div id="pdf-root"></div></body></html>');
    iframeDoc.close();

    // Copy all stylesheets and style tags from the main document to the iframe
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
      const clonedNode = node.cloneNode(true);
      iframeDoc.head.appendChild(clonedNode);
    });

    // Inject custom CSS for PDF styling
    const style = iframeDoc.createElement('style');
    const minHeight = getMinHeightForFormat(options.format);
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
      #pdf-root {
        background-color: white;
      }
      #pdf-root > div { /* The root element rendered by the component */
        box-sizing: border-box;
        /* Removed default border here. Components should apply their own if needed. */
        /* Removed default padding here. Components should apply their own if needed. */
        min-height: ${minHeight}; /* Dynamic min-height for page content */
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: stretch;
      }
      #pdf-root table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto; /* Allow tables to break across pages */
      }
      #pdf-root table thead {
        display: table-header-group; /* Repeat table headers on new pages */
      }
      #pdf-root table tr {
        page-break-inside: auto; /* Allow table rows to break across pages */
        page-break-before: auto;
        page-break-after: auto;
      }
      #pdf-root table th, #pdf-root table td {
        padding: 8px; /* Consistent padding for cells */
        border-bottom: 1px solid #eee; /* Light border for rows */
        vertical-align: top; /* Align content to top */
      }
      #pdf-root table tr.border-b:last-child td {
        border-bottom: none; /* Remove bottom border for last row if it has border-b class */
      }
      #pdf-root h1, #pdf-root h2, #pdf-root h3, #pdf-root h4, #pdf-root h5, #pdf-root h6 {
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      #pdf-root p {
        page-break-inside: avoid;
      }
      #pdf-root hr {
        page-break-after: avoid;
        page-break-before: avoid;
      }
    `;
    iframeDoc.head.appendChild(style);

    const pdfRoot = iframeDoc.getElementById('pdf-root');
    if (!pdfRoot) {
      dismissToast(toastId);
      showError("PDF root element not found in iframe.");
      iframe.parentNode?.removeChild(iframe);
      return;
    }

    const root = ReactDOM.createRoot(pdfRoot);
    (iframe as any)._reactRoot = root; // Store root for cleanup

    let resolveReady: () => void;
    const readyPromise = new Promise<void>(resolve => { resolveReady = resolve; });

    root.render(
      renderComponent({
        onReadyForPdf: () => {
          console.log(`Component for ${options.filename} signaled readiness.`);
          resolveReady();
        },
        isPdfGeneration: true, // Pass this prop to the rendered component
      })
    );

    // Fallback if onReadyForPdf doesn't fire (e.g., no images, or component renders very fast)
    const timeoutId = setTimeout(() => {
      console.warn(`Component for ${options.filename} rendering timed out, proceeding with PDF generation.`);
      resolveReady();
    }, 5000); // Increased delay for iframe content to settle

    try {
      await readyPromise; // Wait for the component to signal readiness
      clearTimeout(timeoutId); // Clear timeout if resolved earlier

      const html2pdfOptions = {
        margin: [10, 10, 10, 10] as [number, number, number, number], // Set 10mm margin for the PDF page
        filename: options.filename,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' as 'portrait' }
      };

      const pdf = await html2pdf().from(pdfRoot).set(html2pdfOptions).toPdf().get('pdf');

      // --- Programmatically draw border on each page ---
      const borderWidth = 0.5; // 0.5mm border (approx 1.89px)
      const borderOffset = 10; // 10mm offset from page edge (matches html2pdf margin)
      const borderColor = '#000000'; // Black

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          // Calculate rectangle dimensions for the border
          const rectX = borderOffset;
          const rectY = borderOffset;
          const rectWidth = pageWidth - (2 * borderOffset);
          const rectHeight = pageHeight - (2 * borderOffset);

          pdf.setDrawColor(borderColor);
          pdf.setLineWidth(borderWidth);

          if (options.documentType === 'payslip') {
              const cornerRadius = 5; // 5mm radius for payslips
              pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, cornerRadius, cornerRadius, 'S'); // 'S' for stroke
          } else { // Default to report style (rectangular)
              pdf.rect(rectX, rectY, rectWidth, rectHeight, 'S');
          }
      }
      // --- End programmatic border drawing ---

      if (isBulk) { // For bulk, we just return the jsPDF instance
          return pdf;
      } else {
          pdf.save(options.filename);
          showSuccess(`${options.filename} PDF downloaded successfully!`);
      }

    } catch (error: any) {
      showError(`Error generating PDF for ${options.filename}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf generation error for ${options.filename}:`, error);
      throw error; // Re-throw to be caught by the caller
    } finally {
      dismissToast(toastId);
      // Clean up the iframe and its React root
      if (root) {
        root.unmount();
      }
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  }, []);

  const printPdf = useCallback(async (
    renderComponent: (props: RenderComponentProps) => React.ReactElement,
    options: PdfOptions,
    isBulk: boolean = false,
  ) => {
    const toastId = showLoading(`Preparing ${options.filename} for printing, please wait...`) as string;

    // Create a hidden iframe for rendering
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
      dismissToast(toastId);
      showError("Could not access iframe document for printing.");
      iframe.parentNode?.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write('<!DOCTYPE html><html><head><title>Print Content</title></head><body><div id="pdf-root"></div></body></html>');
    iframeDoc.close();

    // Copy all stylesheets and style tags from the main document to the iframe
    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
      const clonedNode = node.cloneNode(true);
      iframeDoc.head.appendChild(clonedNode);
    });

    // Inject custom CSS for PDF styling
    const style = iframeDoc.createElement('style');
    const minHeight = getMinHeightForFormat(options.format);
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
      #pdf-root {
        background-color: white;
      }
      #pdf-root > div { /* The root element rendered by the component */
        box-sizing: border-box;
        /* Removed default border here. Components should apply their own if needed. */
        padding: 10mm; /* Internal padding for content */
        min-height: ${minHeight}; /* Dynamic min-height for page content */
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: stretch;
      }
      #pdf-root table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto; /* Allow tables to break across pages */
      }
      #pdf-root table thead {
        display: table-header-group; /* Repeat table headers on new pages */
      }
      #pdf-root table tr {
        page-break-inside: auto; /* Allow table rows to break across pages */
        page-break-before: auto;
        page-break-after: auto;
      }
      #pdf-root table th, #pdf-root table td {
        padding: 8px; /* Consistent padding for cells */
        border-bottom: 1px solid #eee; /* Light border for rows */
        vertical-align: top; /* Align content to top */
      }
      #pdf-root table tr.border-b:last-child td {
        border-bottom: none; /* Remove bottom border for last row if it has border-b class */
      }
      #pdf-root h1, #pdf-root h2, #pdf-root h3, #pdf-root h4, #pdf-root h5, #pdf-root h6 {
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      #pdf-root p {
        page-break-inside: avoid;
      }
      #pdf-root hr {
        page-break-after: avoid;
        page-break-before: avoid;
      }
    `;
    iframeDoc.head.appendChild(style);

    const pdfRoot = iframeDoc.getElementById('pdf-root');
    if (!pdfRoot) {
      dismissToast(toastId);
      showError("Print root element not found in iframe.");
      iframe.parentNode?.removeChild(iframe);
      return;
    }

    const root = ReactDOM.createRoot(pdfRoot);
    (iframe as any)._reactRoot = root; // Store root for cleanup

    let resolveReady: () => void;
    const readyPromise = new Promise<void>(resolve => { resolveReady = resolve; });

    root.render(
      renderComponent({
        onReadyForPdf: () => {
          console.log(`Component for ${options.filename} signaled readiness for print.`);
          resolveReady();
        },
        isPdfGeneration: true, // Pass this prop to the rendered component
      })
    );

    // Fallback if onReadyForPdf doesn't fire
    const timeoutId = setTimeout(() => {
      console.warn(`Component for ${options.filename} rendering timed out for print, proceeding.`);
      resolveReady();
    }, 5000);

    try {
      await readyPromise;
      clearTimeout(timeoutId);

      const html2pdfOptions = {
        margin: [10, 10, 10, 10] as [number, number, number, number], // Set 10mm margin for the PDF page
        filename: options.filename,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' as 'portrait' }
      };

      const pdf = await html2pdf().from(pdfRoot).set(html2pdfOptions).toPdf().get('pdf');

      // --- Programmatically draw border on each page ---
      const borderWidth = 0.5; // 0.5mm border (approx 1.89px)
      const borderOffset = 10; // 10mm offset from page edge (matches html2pdf margin)
      const borderColor = '#000000'; // Black

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);

          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          // Calculate rectangle dimensions for the border
          const rectX = borderOffset;
          const rectY = borderOffset;
          const rectWidth = pageWidth - (2 * borderOffset);
          const rectHeight = pageHeight - (2 * borderOffset);

          pdf.setDrawColor(borderColor);
          pdf.setLineWidth(borderWidth);

          if (options.documentType === 'payslip') {
              const cornerRadius = 5; // 5mm radius for payslips
              pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, cornerRadius, cornerRadius, 'S'); // 'S' for stroke
          } else { // Default to report style (rectangular)
              pdf.rect(rectX, rectY, rectWidth, rectHeight, 'S');
          }
      }
      // --- End programmatic border drawing ---

      pdf.output('dataurlnewwindow');
      showSuccess(`${options.filename} sent to printer.`);

    } catch (error: any) {
      showError(`Error preparing ${options.filename} for printing: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf print error for ${options.filename}:`, error);
      throw error;
    } finally {
      dismissToast(toastId);
      if (root) {
        root.unmount();
      }
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  }, []);

  return { generatePdf, printPdf };
};