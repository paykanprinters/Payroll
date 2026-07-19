import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  maxDuration: 60,
  memory: 1024,
};

type PdfRequestBody = {
  html?: string;
  paperSize?: "A4" | "A5" | "Letter";
  orientation?: "portrait" | "landscape";
};

/**
 * Production Chromium HTML→PDF for catalog reports.
 * Deployed as a Vercel Serverless Function; uses @sparticuz/chromium + puppeteer-core.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization required" });
  }

  try {
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as PdfRequestBody;
    const html = body?.html;
    if (!html || typeof html !== "string") {
      return res.status(400).json({ error: "Missing html" });
    }
    if (html.length > 1_500_000) {
      return res.status(413).json({ error: "HTML payload too large" });
    }

    const paperSize = body.paperSize === "A5" || body.paperSize === "Letter" ? body.paperSize : "A4";
    const orientation = body.orientation === "landscape" ? "landscape" : "portrait";

    const puppeteer = await import("puppeteer-core");
    const chromium = await import("@sparticuz/chromium");

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 45_000 });
      const pdf = await page.pdf({
        format: paperSize === "Letter" ? "Letter" : paperSize,
        landscape: orientation === "landscape",
        printBackground: true,
        margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        preferCSSPageSize: true,
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(Buffer.from(pdf));
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("render-report-pdf failed", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "PDF render failed",
    });
  }
}
