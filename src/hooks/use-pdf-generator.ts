import { useCallback } from 'react';
import { sanitizeHtml } from '@/utils/sanitize-html';

type GeneratePdfOptions = {
  filename: string;
  html: string;
};

export default function usePdfGenerator() {
  const generatePdf = useCallback(async ({ filename, html }: GeneratePdfOptions) => {
    const cleanHtml = sanitizeHtml(html);

    // Assuming a client-side PDF renderer (e.g., html2pdf or similar) is used elsewhere.
    // Expose sanitized HTML to whichever renderer consumes it.
    const blob = new Blob([cleanHtml], { type: 'text/html' });

    // Consumers can read this blob as string or pass to renderer; keeping minimal change here.
    // Example download fallback (optional):
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { generatePdf };
}