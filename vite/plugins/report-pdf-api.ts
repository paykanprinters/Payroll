import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { renderHtmlToPdfBuffer } from "../lib/render-html-pdf";

type PdfRequestBody = {
  html?: string;
  paperSize?: "A4" | "A5" | "Letter";
  orientation?: "portrait" | "landscape";
};

async function readJsonBody(req: IncomingMessage): Promise<PdfRequestBody> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as PdfRequestBody;
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function isLocalDevRequest(req: IncomingMessage): boolean {
  const host = req.headers.host || "";
  const hostname = host.split(":")[0]?.toLowerCase() || "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/**
 * Dev Chromium HTML→PDF at POST /api/render-report-pdf (Playwright).
 * Localhost only — production uses the Vercel serverless function with JWT validation.
 */
export function reportPdfApiPlugin(): Plugin {
  return {
    name: "report-pdf-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api/render-report-pdf") {
          next();
          return;
        }

        if (!isLocalDevRequest(req)) {
          sendJson(res, 403, { error: "PDF render API is only available on localhost in dev" });
          return;
        }

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
          res.end();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const html = body.html;
          if (!html || typeof html !== "string") {
            sendJson(res, 400, { error: "Missing html" });
            return;
          }
          if (html.length > 1_500_000) {
            sendJson(res, 413, { error: "HTML payload too large" });
            return;
          }

          const pdf = await renderHtmlToPdfBuffer({
            html,
            paperSize: body.paperSize,
            orientation: body.orientation,
          });
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Cache-Control", "no-store");
          res.end(pdf);
        } catch (err) {
          sendJson(res, 500, {
            error: err instanceof Error ? err.message : "PDF render failed",
          });
        }
      });
    },
  };
}
