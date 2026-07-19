/**
 * Shared HTML→PDF render helper used by the Vite dev middleware.
 * Uses Playwright Chromium already installed for e2e.
 */
export type RenderHtmlPdfInput = {
  html: string;
  paperSize?: "A4" | "A5" | "Letter";
  orientation?: "portrait" | "landscape";
};

export async function renderHtmlToPdfBuffer(input: RenderHtmlPdfInput): Promise<Buffer> {
  const paperSize =
    input.paperSize === "A5" || input.paperSize === "Letter" ? input.paperSize : "A4";
  const orientation = input.orientation === "landscape" ? "landscape" : "portrait";

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(input.html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: paperSize === "Letter" ? "Letter" : paperSize,
      landscape: orientation === "landscape",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
