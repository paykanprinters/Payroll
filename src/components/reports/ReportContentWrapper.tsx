"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn, getPrintStyles } from "@/lib/utils";
import { sanitizeHtml } from "@/utils/sanitize-html";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import {
  getOrientedPaperMm,
  getReportPreviewPageClasses,
  type ReportPageOrientation,
} from "@/lib/report-paper";

interface ReportContentWrapperProps {
  reportTitle: string;
  reportContent: string; // HTML string for the report body
  companyDetails: MockCompanyDetails | null; // Now accepts null
  reportDesignSettings: ReportDesignSettings;
  onReadyForPdf?: () => void;
  isPdfGeneration?: boolean; // New prop to indicate PDF generation context
  /** When false, keep physical paper width (for scaled design preview). Default true. */
  constrainToParent?: boolean;
  /** Matches PDF page orientation. */
  pageOrientation?: ReportPageOrientation;
  /**
   * `sheet` = print-like rectangle (no rounded card chrome) — use in preview dialogs.
   * `card` = legacy soft UI card (rounded + shadow).
   */
  chrome?: "sheet" | "card";
}

const ReportContentWrapper: React.FC<ReportContentWrapperProps> = ({
  reportTitle,
  reportContent,
  companyDetails,
  reportDesignSettings,
  onReadyForPdf,
  isPdfGeneration = false,
  constrainToParent = true,
  pageOrientation = "portrait",
  chrome = "card",
}) => {
  const {
    companyLegalName,
    companyTradingName,
    companyRegistrationNumber,
    vatRegistrationNumber,
    physicalAddress,
    mainContactNumber,
    companyEmail,
    companyWebsite,
    logoUrl: companyLogoUrl,
    logoWidth: companyLogoWidth,
    logoHeight: companyLogoHeight,
    logoFit: companyLogoFit,
  } = companyDetails || {};

  const displayCompanyName = companyLegalName || companyTradingName || "Your Company Name";
  const resolvedLogoUrl = reportDesignSettings.includeCompanyLogo
    ? resolveCompanyLogoSource(companyLogoUrl)
    : undefined;
  const logoDims = resolveDocumentLogoDimensions(companyLogoWidth, companyLogoHeight, companyLogoFit);

  const printStyles = getPrintStyles(reportDesignSettings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(printStyles.fontSize?.toString().replace("px", "") || "14");

  const sanitizedReportContent = React.useMemo(
    () => sanitizeHtml(reportContent),
    [reportContent]
  );

  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const imageRefs = React.useRef<HTMLImageElement[]>([]);

  React.useEffect(() => {
    if (!isPdfGeneration) {
      setImagesLoaded(true);
      return;
    }

    let loadedCount = 0;
    const totalImages = imageRefs.current.length;

    if (totalImages === 0) {
      setImagesLoaded(true);
      return;
    }

    const handleImageLoad = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        setImagesLoaded(true);
      }
    };

    const images = Array.from(imageRefs.current);
    images.forEach((img) => {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener("load", handleImageLoad);
        img.addEventListener("error", handleImageLoad);
      }
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("load", handleImageLoad);
        img.removeEventListener("error", handleImageLoad);
      });
    };
  }, [resolvedLogoUrl, isPdfGeneration]);

  React.useEffect(() => {
    if (imagesLoaded && onReadyForPdf) {
      onReadyForPdf();
    }
  }, [imagesLoaded, onReadyForPdf]);

  const oriented = getOrientedPaperMm(
    reportDesignSettings.defaultReportPaperSize,
    pageOrientation
  );
  const useInlinePaperBox = chrome === "sheet" || pageOrientation === "landscape";
  const previewPageClasses = useInlinePaperBox
    ? undefined
    : getReportPreviewPageClasses(reportDesignSettings.defaultReportPaperSize);

  const sheetStyle: React.CSSProperties = isPdfGeneration
    ? {
        ...printStyles,
        padding: "10mm",
        border: "none",
        boxShadow: "none",
      }
    : chrome === "sheet"
      ? {
          width: `${oriented.width}mm`,
          minHeight: `${oriented.height}mm`,
          padding: "24px",
          fontSize: printStyles.fontSize,
          border: "1px solid #d1d5db",
          borderRadius: 0,
          boxShadow: "none",
        }
      : {
          padding: "24px",
          fontSize: printStyles.fontSize,
          border: "1px solid #ccc",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        };

  return (
    <div
      className={cn(
        "bg-white text-gray-900",
        !isPdfGeneration && chrome === "card" && "mx-auto rounded-lg shadow-lg",
        !isPdfGeneration && chrome === "sheet" && "mx-auto",
        !isPdfGeneration && constrainToParent && "max-w-full",
        !isPdfGeneration && previewPageClasses
      )}
      style={sheetStyle}
    >
      {(reportDesignSettings.includeCompanyLogo && resolvedLogoUrl) ||
      reportDesignSettings.includeCompanyDetails ? (
        <div className="mb-6 flex items-start justify-between print:mb-8">
          {reportDesignSettings.includeCompanyLogo && resolvedLogoUrl && (
            <img
              ref={(el) => {
                if (el) imageRefs.current.push(el);
              }}
              src={resolvedLogoUrl}
              alt="Company Logo"
              style={{ width: logoDims.width, height: logoDims.height, objectFit: logoDims.fit }}
              className="flex-shrink-0 print:h-[60px] print:w-[60px]"
            />
          )}
          {reportDesignSettings.includeCompanyDetails && (
            <div
              className="w-full text-right text-[13px] print:text-[13px]"
              style={{ fontSize: `${baseFontSizePx * 0.9}px` }}
            >
              <h2
                className="text-md font-bold print:text-lg"
                style={{ fontSize: `${baseFontSizePx * 1.2}px` }}
              >
                {displayCompanyName}
              </h2>
              {companyTradingName && companyTradingName !== companyLegalName && (
                <p
                  className="text-[13px] print:text-[13px]"
                  style={{ fontSize: `${baseFontSizePx * 1}px` }}
                >
                  {companyTradingName}
                </p>
              )}
              <p>{physicalAddress}</p>
              <p>Reg. No: {companyRegistrationNumber}</p>
              <p>VAT No: {vatRegistrationNumber}</p>
              <p>Tel: {mainContactNumber}</p>
              <p>Email: {companyEmail}</p>
              <p>Web: {companyWebsite}</p>
            </div>
          )}
        </div>
      ) : null}

      <Separator className="my-4 print:my-4" style={{ margin: `${baseFontSizePx * 1}px 0` }} />

      <h3
        className="mb-4 text-center text-lg font-bold print:mb-6 print:text-xl"
        style={{
          fontSize: `${baseFontSizePx * 1.3}px`,
          marginBottom: `${baseFontSizePx * 1}px`,
        }}
      >
        {reportTitle}
      </h3>

      <div
        dangerouslySetInnerHTML={{ __html: sanitizedReportContent }}
        style={{ fontSize: `${reportDesignSettings.reportContentFontSize}px` }}
      />
    </div>
  );
};

export default ReportContentWrapper;
