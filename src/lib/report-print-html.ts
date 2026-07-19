import { escapeHtml } from "@/lib/escape-html";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import { getOrientedPaperMm, getReportPaper, type ReportPageOrientation } from "@/lib/report-paper";
import {
  getReportSheetBorderCss,
  getReportSheetChrome,
  getReportSheetInnerHeightMm,
  getReportSheetOuterHeightMm,
  getReportSheetOuterWidthMm,
} from "@/lib/report-sheet-layout";
import { REPORT_SHEET_PAGINATION_SCRIPT } from "@/lib/report-sheet-pagination-script";
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
 * Self-contained HTML for Chromium print/PDF.
 * Content is paginated into fixed sheets driven by Report Design chrome settings.
 */
export function buildReportPrintDocumentHtml(input: BuildReportPrintDocumentInput): string {
  const orientation = input.orientation ?? "portrait";
  const settings = input.reportDesignSettings;
  const chrome = getReportSheetChrome(settings);
  const company = input.companyDetails;
  const oriented = getOrientedPaperMm(settings.defaultReportPaperSize, orientation);
  const paper = getReportPaper(settings.defaultReportPaperSize);
  const printStyles = getPrintStyles(settings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(String(printStyles.fontSize || "14").replace("px", "")) || 14;
  const bodyFont = settings.reportContentFontSize || 14;

  const sheetOuterW = getReportSheetOuterWidthMm(oriented.width, chrome);
  const sheetOuterH = getReportSheetOuterHeightMm(oriented.height, chrome);
  const sheetInnerH = getReportSheetInnerHeightMm(oriented.height, chrome);
  // ~3.78 px/mm at 96dpi — used by the pagination script
  const sheetInnerMaxPx = Math.round(sheetInnerH * (96 / 25.4));
  const sheetBorderCss = getReportSheetBorderCss(chrome);
  const flowWidthMm = sheetOuterW - chrome.pageContentPaddingMm * 2;

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
      `<div class="report-header" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px;">${logoHtml}${detailsHtml}</div>`
    );
  }

  const pageSizeCss =
    paper.label === "US Letter" ? "letter" : settings.defaultReportPaperSize.toLowerCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.reportTitle)}</title>
  <style>
    :root {
      --sheet-inner-max-px: ${sheetInnerMaxPx};
    }
    @page {
      size: ${pageSizeCss} ${orientation};
      margin: ${chrome.pageSheetInsetMm}mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #e8ecf1;
      color: #111;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      font-size: ${baseFontSizePx}px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    #sheets {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 12px;
    }
    .sheet {
      width: ${sheetOuterW}mm;
      height: ${sheetOuterH}mm;
      background: #fff;
      border: ${sheetBorderCss};
      border-radius: ${chrome.pageBorderRadiusPx}px;
      padding: ${chrome.pageContentPaddingMm}mm;
      overflow: hidden;
      break-after: page;
      page-break-after: always;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    }
    .sheet:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .sheet-inner {
      overflow: hidden;
    }
    #report-flow {
      position: absolute;
      left: -10000px;
      top: 0;
      width: ${flowWidthMm}mm;
      visibility: hidden;
      pointer-events: none;
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
    .body, .sheet-inner {
      font-size: ${bodyFont}px;
      line-height: 1.4;
    }
    .sheet-inner table, #report-flow table {
      width: 100%;
      border-collapse: collapse;
    }
    .sheet-inner th, .sheet-inner td,
    #report-flow th, #report-flow td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .sheet-inner th, #report-flow th {
      background: #f8fafc;
      text-align: left;
      font-weight: 700;
    }
    .report-header, .title, .rule, tr, h3, h4, p {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      html, body { background: #fff; }
      #sheets { padding: 0; gap: 0; }
      .sheet {
        width: 100%;
        height: ${sheetOuterH}mm;
        box-shadow: none;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div id="report-flow">
    ${headerParts.join("")}
    <hr class="rule" />
    <h1 class="title">${escapeHtml(input.reportTitle)}</h1>
    <div class="body">${sanitizedBody}</div>
  </div>
  <div id="sheets" aria-live="polite"></div>
  <script>${REPORT_SHEET_PAGINATION_SCRIPT}</script>
</body>
</html>`;
}
