"use client";

import React, { useCallback } from "react";
import ReactDOM from 'react-dom/client';
import html2pdf from 'html2pdf.js';
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

interface PdfOptions {
  filename: string;
  format?: 'a4' | 'letter' | 'a5';
  orientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number]; // top, left, bottom, right
}

interface RenderComponentProps {
  onReadyForPdf?: () => void;
}

type ComponentRenderer = (container: HTMLDivElement) => Promise<void>;

export const usePdfGenerator = () => {

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
        }
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
        margin: options.margin || [10, 10, 10, 10],
        filename: options.filename,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(pdfRoot).set(html2pdfOptions);

      if (isBulk) { // For bulk, we just return the promise, the caller will handle save/print
        return pdfPromise;
      } else {
        await pdfPromise.save();
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
        }
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
        margin: options.margin || [10, 10, 10, 10],
        filename: options.filename,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: options.format || 'a4', orientation: options.orientation || 'portrait' as 'portrait' }
      };

      const pdf = await html2pdf().from(pdfRoot).set(html2pdfOptions).toPdf().get('pdf');
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