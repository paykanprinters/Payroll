import { escapeHtml } from "@/lib/escape-html";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import { getOrientedPaperMm, getReportPaper, type ReportPageOrientation } from "@/lib/report-paper";
import { getPrintStyles } from "@/lib/utils";
import { sanitizeHtml } from "@/utils/sanitize-html";

export type BuildReportPrintDocumentInput = {
  reportTitle: string;
  reportContentHtml: string;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  orientation?: ReportPageOrientation;
};

/**
 * Self-contained HTML document used for Chromium print/PDF.
 * Mirrors ReportContentWrapper `chrome="sheet"` so preview ≈ export.
 */
export function buildReportPrintDocumentHtml(input: BuildReportPrintDocumentInput): string {
  const orientation = input.orientation ?? "portrait";
  const settings = input.reportDesignSettings;
  const company = input.companyDetails;
  const oriented = getOrientedPaperMm(settings.defaultReportPaperSize, orientation);
  const paper = getReportPaper(settings.defaultReportPaperSize);
  const printStyles = getPrintStyles(settings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(String(printStyles.fontSize || "14").replace("px", "")) || 14;
  const bodyFont = settings.reportContentFontSize || 14;

  const displayName =
    company?.companyLegalName || company?.companyTradingName || "Your Company Name";
  const logoUrl = settings.includeCompanyLogo
    ? resolveCompanyLogoSource(company?.logoUrl)
    : undefined;
  const logoDims = resolveDocumentLogoDimensions(
    company?.logoWidth,
    company?.logoHeight,
    company?.logoFit
  );

  const sanitizedBody = sanitizeHtml(input.reportContentHtml);

  const headerParts: string[] = [];
  if ((settings.includeCompanyLogo && logoUrl) || settings.includeCompanyDetails) {
    const logoHtml =
      settings.includeCompanyLogo && logoUrl
        ? `<img src="${escapeHtml(logoUrl)}" alt="Company logo" style="width:${logoDims.width}px;height:${logoDims.height}px;object-fit:${logoDims.fit};flex-shrink:0;" />`
        : `<div></div>`;
    const detailsHtml = settings.includeCompanyDetails
      ? `<div style="text-align:right;font-size:${baseFontSizePx * 0.9}px;line-height:1.35;width:100%;">
          <div style="font-weight:700;font-size:${baseFontSizePx * 1.2}px;">${escapeHtml(displayName)}</div>
          ${
            company?.companyTradingName &&
            company.companyTradingName !== company.companyLegalName
              ? `<div>${escapeHtml(company.companyTradingName)}</div>`
              : ""
          }
          ${company?.physicalAddress ? `<div>${escapeHtml(company.physicalAddress)}</div>` : ""}
          ${company?.companyRegistrationNumber ? `<div>Reg. No: ${escapeHtml(company.companyRegistrationNumber)}</div>` : ""}
          ${company?.vatRegistrationNumber ? `<div>VAT No: ${escapeHtml(company.vatRegistrationNumber)}</div>` : ""}
          ${company?.mainContactNumber ? `<div>Tel: ${escapeHtml(company.mainContactNumber)}</div>` : ""}
          ${company?.companyEmail ? `<div>Email: ${escapeHtml(company.companyEmail)}</div>` : ""}
          ${company?.companyWebsite ? `<div>Web: ${escapeHtml(company.companyWebsite)}</div>` : ""}
        </div>`
      : "";
    headerParts.push(
      `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px;">${logoHtml}${detailsHtml}</div>`
    );
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.reportTitle)}</title>
  <style>
    @page {
      size: ${paper.label === "US Letter" ? "letter" : settings.defaultReportPaperSize.toLowerCase()} ${orientation};
      margin: 12mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      font-size: ${baseFontSizePx}px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: ${oriented.width}mm;
      min-height: ${oriented.height}mm;
      margin: 0 auto;
      padding: 8mm;
      background: #fff;
    }
    .title {
      text-align: center;
      font-weight: 700;
      font-size: ${baseFontSizePx * 1.3}px;
      margin: ${baseFontSizePx}px 0;
    }
    .rule {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: ${baseFontSizePx}px 0;
    }
    .body {
      font-size: ${bodyFont}px;
      line-height: 1.4;
    }
    .body table {
      width: 100%;
      border-collapse: collapse;
    }
    .body th, .body td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .body th {
      background: #f8fafc;
      text-align: left;
      font-weight: 700;
    }
    @media print {
      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    ${headerParts.join("")}
    <hr class="rule" />
    <h1 class="title">${escapeHtml(input.reportTitle)}</h1>
    <div class="body">${sanitizedBody}</div>
  </div>
</body>
</html>`;
}
