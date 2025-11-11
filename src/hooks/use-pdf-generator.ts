"use client";

import React, { useCallback } from "react";
import ReactDOM from 'react-dom/client';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

interface PdfOptions {
  filename: string;
  format?: 'a4' | 'letter' | 'a5';
  orientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number];
  documentType?: 'payslip' | 'report';
}

interface RenderComponentProps {
  onReadyForPdf?: () => void;
  isPdfGeneration?: boolean;
}

export const usePdfGenerator = () => {
  const getMinHeightForFormat = (format: 'a4' | 'letter' | 'a5' | undefined) => {
    switch (format) {
      case 'letter': return '279.4mm';
      case 'a5': return '210mm';
      case 'a4':
      default: return '297mm';
    }
  };

  const mmToPx = (mm: number) => Math.round(mm * 3.7795);

  const getPageWidthMm = (format: 'a4' | 'letter' | 'a5' | undefined, orientation: 'portrait' | 'landscape' | undefined) => {
    let widthMm = 210;
    let heightMm = 297;
    if (format === 'letter') { widthMm = 215.9; heightMm = 279.4; }
    if (format === 'a5') { widthMm = 148; heightMm = 210; }
    const isLandscape = orientation === 'landscape';
    return isLandscape ? heightMm : widthMm;
  };

  const getPageHeightMm = (format: 'a4' | 'letter' | 'a5' | undefined, orientation: 'portrait' | 'landscape' | undefined) => {
    let widthMm = 210;
    let heightMm = 297;
    if (format === 'letter') { widthMm = 215.9; heightMm = 279.4; }
    if (format === 'a5') { widthMm = 148; heightMm = 210; }
    const isLandscape = orientation === 'landscape';
    return isLandscape ? widthMm : heightMm;
  };

  const generatePdf = useCallback(async (
    renderComponent: (props: RenderComponentProps) => React.ReactElement,
    options: PdfOptions,
    isBulk: boolean = false,
  ) => {
    const toastId = showLoading(`Generating PDF for ${options.filename}, please wait...`) as string;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
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

    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
      const clonedNode = node.cloneNode(true);
      iframeDoc.head.appendChild(clonedNode);
    });

    const style = iframeDoc.createElement('style');
    const pageWidthMm = getPageWidthMm(options.format, options.orientation);
    const pageHeightMm = getPageHeightMm(options.format, options.orientation);
    const contentMarginMm = 10; // consistent inner margin
    const contentWidthMm = pageWidthMm - contentMarginMm * 2;
    const contentHeightMm = pageHeightMm - contentMarginMm * 2;

    style.textContent = `
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
      .pdf-page { page-break-inside: avoid; } /* ensure single page blocks don't split */
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
    (iframe as any)._reactRoot = root;

    let resolveReady!: () => void;
    const readyPromise = new Promise<void>(resolve => { resolveReady = resolve; });

    root.render(
      renderComponent({
        onReadyForPdf: () => resolveReady(),
        isPdfGeneration: true,
      })
    );

    const timeoutId = setTimeout(() => resolveReady(), 5000);

    try {
      await readyPromise;
      clearTimeout(timeoutId);

      // BULK SAFE PATH: render each page-sized block individually to prevent oversized canvases
      if (isBulk) {
        const pdf = new jsPDF({
          unit: 'mm',
          format: options.format || 'a4',
          orientation: (options.orientation || 'portrait') as 'portrait'
        });

        const pageBlocks = Array.from(iframeDoc.querySelectorAll('.pdf-page')) as HTMLElement[];

        if (pageBlocks.length === 0) {
          // Fallback to the original method if no explicit page blocks are found
          const html2pdfOptions = {
            margin: [contentMarginMm, contentMarginMm, contentMarginMm, contentMarginMm] as [number, number, number, number],
            filename: options.filename,
            image: { type: 'jpeg' as 'jpeg', quality: 0.92 },
            html2canvas: {
              scale: 2,
              logging: false,
              letterRendering: false,
              useCORS: true,
              windowWidth: mmToPx(contentWidthMm),
              scrollY: 0,
            },
            pagebreak: { mode: ['css', 'legacy'] as any },
            jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: (options.orientation || 'portrait') as 'portrait' }
          };

          const fallbackPdf = await html2pdf().from(pdfRoot).set(html2pdfOptions).toPdf().get('pdf');

          // Draw borders for each page
          const borderOffset = 10;
          const borderColor = '#000000';
          const borderWidth = 0.5;

          const pageCount = fallbackPdf.internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            fallbackPdf.setPage(i);
            const pageW = fallbackPdf.internal.pageSize.getWidth();
            const pageH = fallbackPdf.internal.pageSize.getHeight();
            const rectX = borderOffset;
            const rectY = borderOffset;
            const rectWidth = pageW - (2 * borderOffset);
            const rectHeight = pageH - (2 * borderOffset);
            fallbackPdf.setDrawColor(borderColor);
            fallbackPdf.setLineWidth(borderWidth);
            if (options.documentType === 'payslip') {
              fallbackPdf.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, 'S');
            } else {
              fallbackPdf.rect(rectX, rectY, rectWidth, rectHeight, 'S');
            }
          }

          // Save or return
          if (isBulk) {
            // Return the jsPDF instance for callers that need it
            dismissToast(toastId);
            if (root) root.unmount();
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            return fallbackPdf;
          } else {
            fallbackPdf.save(options.filename);
            showSuccess(`${options.filename} PDF downloaded successfully!`);
          }
        } else {
          // Render each pdf-page block separately
          const innerHeightPx = mmToPx(contentHeightMm);
          const viewportWidthPx = mmToPx(contentWidthMm);

          for (let i = 0; i < pageBlocks.length; i++) {
            const block = pageBlocks[i];

            const canvas = await html2canvas(block, {
              scale: 2,                    // crisp rendering
              logging: false,
              letterRendering: false,
              useCORS: true,
              windowWidth: viewportWidthPx,
              scrollY: 0,
              backgroundColor: '#ffffff',
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.92);
            const imgWidthMm = contentWidthMm;
            const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm;

            const maxInnerHeightMm = contentHeightMm;
            const scaleRatio = Math.min(1, maxInnerHeightMm / imgHeightMm);
            const finalWidthMm = imgWidthMm * scaleRatio;
            const finalHeightMm = imgHeightMm * scaleRatio;

            if (i > 0) {
              pdf.addPage(options.format || 'a4', options.orientation || 'portrait');
            }

            pdf.addImage(
              imgData,
              'JPEG',
              contentMarginMm,
              contentMarginMm,
              finalWidthMm,
              finalHeightMm,
              undefined,
              'FAST'
            );

            // Draw page border
            const borderOffset = 10;
            const borderColor = '#000000';
            const borderWidth = 0.5;
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const rectX = borderOffset;
            const rectY = borderOffset;
            const rectWidth = pageW - (2 * borderOffset);
            const rectHeight = pageH - (2 * borderOffset);
            pdf.setDrawColor(borderColor);
            pdf.setLineWidth(borderWidth);
            if (options.documentType === 'payslip') {
              pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, 'S');
            } else {
              pdf.rect(rectX, rectY, rectWidth, rectHeight, 'S');
            }
          }

          // Return or save
          if (isBulk) {
            dismissToast(toastId);
            if (root) root.unmount();
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            return pdf;
          } else {
            pdf.save(options.filename);
            showSuccess(`${options.filename} PDF downloaded successfully!`);
          }
        }
      } else {
        // NON-BULK PATH: use html2pdf directly
        const html2pdfOptions = {
          margin: [contentMarginMm, contentMarginMm, contentMarginMm, contentMarginMm] as [number, number, number, number],
          filename: options.filename,
          image: { type: 'jpeg' as 'jpeg', quality: 0.92 },
          html2canvas: {
            scale: 2,
            logging: false,
            letterRendering: false,
            useCORS: true,
            windowWidth: mmToPx(contentWidthMm),
            scrollY: 0,
          },
          pagebreak: { mode: ['css', 'legacy'] as any },
          jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: (options.orientation || 'portrait') as 'portrait' }
        };

        const pdf = await html2pdf().from(pdfRoot).set(html2pdfOptions).toPdf().get('pdf');

        // Draw borders for each page
        const borderOffset = 10;
        const borderColor = '#000000';
        const borderWidth = 0.5;

        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          const rectX = borderOffset;
          const rectY = borderOffset;
          const rectWidth = pageW - (2 * borderOffset);
          const rectHeight = pageH - (2 * borderOffset);
          pdf.setDrawColor(borderColor);
          pdf.setLineWidth(borderWidth);
          if (options.documentType === 'payslip') {
            pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, 'S');
          } else {
            pdf.rect(rectX, rectY, rectWidth, rectHeight, 'S');
          }
        }

        pdf.save(options.filename);
        showSuccess(`${options.filename} PDF downloaded successfully!`);
      }
    } catch (error: any) {
      showError(`Error generating PDF for ${options.filename}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf generation error for ${options.filename}:`, error);
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

  const printPdf = useCallback(async (
    renderComponent: (props: RenderComponentProps) => React.ReactElement,
    options: PdfOptions,
    isBulk: boolean = false,
  ) => {
    const toastId = showLoading(`Preparing ${options.filename} for printing, please wait...`) as string;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
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

    Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
      const clonedNode = node.cloneNode(true);
      iframeDoc.head.appendChild(clonedNode);
    });

    const style = iframeDoc.createElement('style');
    const pageWidthMm = getPageWidthMm(options.format, options.orientation);
    const pageHeightMm = getPageHeightMm(options.format, options.orientation);
    const contentMarginMm = 10;
    const contentWidthMm = pageWidthMm - contentMarginMm * 2;
    style.textContent = `
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
    (iframe as any)._reactRoot = root;

    let resolveReady!: () => void;
    const readyPromise = new Promise<void>(resolve => { resolveReady = resolve; });

    root.render(
      renderComponent({
        onReadyForPdf: () => resolveReady(),
        isPdfGeneration: true,
      })
    );

    const timeoutId = setTimeout(() => resolveReady(), 5000);

    try {
      await readyPromise;
      clearTimeout(timeoutId);

      const html2pdfOptions = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: options.filename,
        image: { type: 'jpeg' as 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          logging: false,
          letterRendering: false,
          useCORS: true,
          windowWidth: mmToPx(contentWidthMm),
          scrollY: 0,
        },
        pagebreak: { mode: ['css', 'legacy'] as any },
        jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: (options.orientation || 'portrait') as 'portrait' }
      };

      const pdf = await html2pdf().from(pdfRoot).set(html2pdfOptions).toPdf().get('pdf');

      // Programmatic border on each page
      const borderWidth = 0.5;
      const borderOffset = 10;
      const borderColor = '#000000';

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const rectX = borderOffset;
        const rectY = borderOffset;
        const rectWidth = pageWidth - (2 * borderOffset);
        const rectHeight = pageHeight - (2 * borderOffset);
        pdf.setDrawColor(borderColor);
        pdf.setLineWidth(borderWidth);
        if (options.documentType === 'payslip') {
          pdf.roundedRect(rectX, rectY, rectWidth, rectHeight, 5, 5, 'S');
        } else {
          pdf.rect(rectX, rectY, rectWidth, rectHeight, 'S');
        }
      }

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