import { useCallback } from "react";
import { sanitizeHTML } from "@/utils/sanitize-html";

type Options = {
  filename?: string;
};

function usePdfGenerator() {
  const generatePdfFromHtml = useCallback((html: string, opts?: Options) => {
    const name = opts?.filename ?? "document";
    const safe = sanitizeHTML(html);
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(`<!doctype html><html><head><title>${name}</title></head><body>${safe}</body></html>`);
    win.document.close();
    // Give the browser a tick to render before triggering print (optional)
    setTimeout(() => {
      try { win.print?.(); } catch {}
    }, 250);
  }, []);

  return { generatePdfFromHtml };
}

export { usePdfGenerator };
export default usePdfGenerator;