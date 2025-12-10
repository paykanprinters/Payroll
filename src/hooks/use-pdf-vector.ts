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
    try {
      const blob = await pdf(documentNode).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Do not revoke immediately; let the browser load it
      setTimeout(() => URL.revokeObjectURL(url), 30000);
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