import React from "react";
import { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { sanitizeHTML } from "@/utils/sanitize-html";

type Options = {
  filename?: string;
  format?: "a4" | "letter" | "a5";
  orientation?: "portrait" | "landscape";
  documentType?: "payslip" | "report";
};

function usePdfGenerator() {
  const renderElementToHtml = useCallback(async (renderer: (args?: any) => React.ReactElement) => {
    // Create a temporary container and render the element to capture HTML
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    document.body.appendChild(container);
    const root = createRoot(container);
    let resolveFn: () => void;
    const done = new Promise<void>((resolve) => { resolveFn = resolve; });
    const element = renderer({ onReadyForPdf: () => resolveFn!() });
    root.render(element);
    // Wait a frame to allow render
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    // Wait for optional onReadyForPdf signal briefly
    await Promise.race([done, new Promise((r) => setTimeout(r, 150))]);
    const html = container.innerHTML;
    root.unmount();
    document.body.removeChild(container);
    return html;
  }, []);

  const openWindowWithHtml = useCallback((html: string, name: string) => {
    const safe = sanitizeHTML(html);
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>${name}</title></head><body>${safe}</body></html>`);
    win.document.close();
    return win;
  }, []);

  const generatePdfFromHtml = useCallback((html: string, opts?: Options) => {
    const name = opts?.filename ?? "document";
    const win = openWindowWithHtml(html, name);
    // No auto print on download; rely on browser's Save dialog
    return !!win;
  }, [openWindowWithHtml]);

  const generatePdf = useCallback(async (renderOrHtml: any, opts?: Options) => {
    const name = opts?.filename ?? "document";
    let html = typeof renderOrHtml === "function" ? await renderElementToHtml(renderOrHtml) : String(renderOrHtml ?? "");
    openWindowWithHtml(html, name);
    return true;
  }, [openWindowWithHtml, renderElementToHtml]);

  const printPdf = useCallback(async (renderOrHtml: any, opts?: Options) => {
    const name = opts?.filename ?? "document";
    let html = typeof renderOrHtml === "function" ? await renderElementToHtml(renderOrHtml) : String(renderOrHtml ?? "");
    const win = openWindowWithHtml(html, name);
    setTimeout(() => { try { win?.print?.(); } catch {} }, 250);
    return true;
  }, [openWindowWithHtml, renderElementToHtml]);

  return { generatePdfFromHtml, generatePdf, printPdf };
}

export { usePdfGenerator };
export default usePdfGenerator;