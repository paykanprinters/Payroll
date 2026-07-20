/**
 * Shared HTML→PDF render helper used by the Vite dev middleware.
 * Uses Playwright Chromium already installed for e2e.
 */
import { blockExternalNetworkRequests } from "./block-external-requests";

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
    await blockExternalNetworkRequests(page);
    await page.setContent(input.html, { waitUntil: "load" });
    await page.waitForFunction("window.__REPORT_PAGINATED__ === true", null, { timeout: 30_000 });
    const pdf = await page.pdf({
      format: paperSize === "Letter" ? "Letter" : paperSize,
      landscape: orientation === "landscape",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
