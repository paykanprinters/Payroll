"use client";

import React, { useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";

export const usePdfVector = () => {
  const downloadPdf = useCallback(async (documentNode: React.ReactElement, filename: string) => {
    const toastId = showLoading(`Preparing ${filename} (vector PDF), please wait...`) as string;
    try {
      const blob = await pdf(documentNode).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(`${filename} downloaded successfully!`);
    } catch (err: any) {
      showError(`Vector PDF generation failed: ${err?.message || "Unknown error"}`);
      throw err;
    } finally {
      dismissToast(toastId);
    }
  }, []);

  const openPdf = useCallback(async (documentNode: React.ReactElement, title: string) => {
    const toastId = showLoading(`Opening ${title} (vector PDF), please wait...`) as string;

    // Opening a new tab and returning often triggers app-wide focus refresh.
    // Suppress that for a short window to avoid a burst of parallel Supabase refetches
    // while the browser is still busy rendering the PDF.
    try {
      sessionStorage.setItem("suppressAppFocusRefreshUntil", String(Date.now() + 2 * 60 * 1000));
    } catch {
      // ignore
    }

    try {
      // Open a placeholder tab immediately so popup blockers don't interfere.
      const w = window.open("about:blank", "_blank");
      const blob = await pdf(documentNode).toBlob();
      const url = URL.createObjectURL(blob);

      if (w) {
        w.location.href = url;
      } else {
        window.open(url, "_blank");
      }

      // Do not revoke immediately; let the browser load it.
      // Keep it longer to support slower devices; revoke eventually.
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
      showSuccess(`${title} opened in a new tab.`);
    } catch (err: any) {
      showError(`Vector PDF open failed: ${err?.message || "Unknown error"}`);
      throw err;
    } finally {
      dismissToast(toastId);
    }
  }, []);

  return { downloadPdf, openPdf };
};