"use client";

import React from "react";
import { cn, getPrintStyles } from "@/lib/utils";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";

const PAPER_MM: Record<"Letter" | "A4" | "A5", { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
};

type Props = {
  settings: ReportDesignSettings;
  companyDetails: MockCompanyDetails | null;
  className?: string;
};

/**
 * Live preview chrome matching ReportPreviewDialog / HtmlReportPdfDocument
 * so Report Design settings are visible before export.
 */
const ReportDesignPreview: React.FC<Props> = ({ settings, companyDetails, className }) => {
  const companyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company Name";
  const logoUrl = settings.includeCompanyLogo
    ? resolveCompanyLogoSource(companyDetails?.logoUrl)
    : undefined;
  const logoDims = resolveDocumentLogoDimensions(
    companyDetails?.logoWidth,
    companyDetails?.logoHeight,
    companyDetails?.logoFit
  );
  const paper = PAPER_MM[settings.defaultReportPaperSize || "A4"];
  const printStyles = getPrintStyles(settings.defaultReportPaperSize);

  return (
    <div
      className={cn(
        "mx-auto overflow-hidden rounded-md border bg-white shadow-sm print-preview-page",
        className
      )}
      style={{
        ...printStyles,
        width: `${paper.width}mm`,
        minHeight: `${Math.min(paper.height, 220)}mm`,
        maxWidth: "100%",
      }}
    >
      {(settings.includeCompanyLogo && logoUrl) || settings.includeCompanyDetails ? (
        <div className="mb-4 flex items-start justify-between gap-4 border-b pb-3">
          {settings.includeCompanyLogo && logoUrl ? (
            <img
              src={logoUrl}
              alt="Company logo"
              style={{
                width: logoDims.width,
                height: logoDims.height,
                objectFit: logoDims.objectFit,
              }}
            />
          ) : (
            <div />
          )}
          {settings.includeCompanyDetails && (
            <div className="text-right text-xs leading-relaxed text-muted-foreground">
              <div className="font-semibold text-foreground">{companyName}</div>
              {companyDetails?.physicalAddress && <div>{companyDetails.physicalAddress}</div>}
              {companyDetails?.companyRegistrationNumber && (
                <div>Reg. No: {companyDetails.companyRegistrationNumber}</div>
              )}
              {companyDetails?.vatRegistrationNumber && (
                <div>VAT No: {companyDetails.vatRegistrationNumber}</div>
              )}
              {companyDetails?.mainContactNumber && <div>Tel: {companyDetails.mainContactNumber}</div>}
              {companyDetails?.companyEmail && <div>Email: {companyDetails.companyEmail}</div>}
            </div>
          )}
        </div>
      ) : null}

      <h2 className="mb-2 text-center text-base font-semibold">Sample payroll readiness</h2>
      <p className="mb-3 text-center text-xs text-muted-foreground">
        Paper: {settings.defaultReportPaperSize} · Content font: {settings.reportContentFontSize}px
      </p>

      <div style={{ fontSize: `${settings.reportContentFontSize}px` }} className="space-y-3">
        <p>
          This preview uses your Report Design settings. Reports opened from the Reports library
          use the same header, paper size, and font for preview, PDF download, and print.
        </p>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1 pr-2">Check</th>
              <th className="py-1 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-1 pr-2">Company logo</td>
              <td className="py-1 text-right">{settings.includeCompanyLogo ? "On" : "Off"}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 pr-2">Company details</td>
              <td className="py-1 text-right">{settings.includeCompanyDetails ? "On" : "Off"}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2">Sample employee row</td>
              <td className="py-1 text-right">Ready</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportDesignPreview;
