"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn, getPrintStyles } from "@/lib/utils";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";

interface ReportContentWrapperProps {
  reportTitle: string;
  reportContent: string; // HTML string for the report body
  companyDetails: MockCompanyDetails | null; // Now accepts null
  reportDesignSettings: ReportDesignSettings;
  onReadyForPdf?: () => void; // Callback to signal readiness for PDF generation
  isPdfGeneration?: boolean; // New prop to indicate PDF generation context
}

const ReportContentWrapper: React.FC<ReportContentWrapperProps> = ({
  reportTitle,
  reportContent,
  companyDetails,
  reportDesignSettings,
  onReadyForPdf,
  isPdfGeneration = false, // Default to false
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
    logoWidth: companyLogoWidth, // Use new width
    logoHeight: companyLogoHeight, // Use new height
    logoFit: companyLogoFit, // Use new fit
  } = companyDetails || {}; // Destructure with fallback to empty object

  const displayCompanyName = companyLegalName || companyTradingName || "Your Company Name";

  // Get explicit print styles based on layout size
  const printStyles = getPrintStyles(reportDesignSettings.defaultReportPaperSize);
  const baseFontSizePx = parseFloat(printStyles.fontSize?.toString().replace('px', '') || '14'); // Ensure it's a number

  const [imagesLoaded, setImagesLoaded] = React.useState(false);
  const imageRefs = React.useRef<HTMLImageElement[]>([]);

  React.useEffect(() => {
    if (!isPdfGeneration) {
      setImagesLoaded(true); // Not generating PDF, so no need to wait for images
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

    imageRefs.current.forEach(img => {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener('load', handleImageLoad);
        img.addEventListener('error', handleImageLoad); // Treat error as loaded to not block PDF
      }
    });

    return () => {
      imageRefs.current.forEach(img => {
        img.removeEventListener('load', handleImageLoad);
        img.removeEventListener('error', handleImageLoad);
      });
    };
  }, [companyLogoUrl, isPdfGeneration]); // Re-run if logo URL changes or PDF generation context changes

  React.useEffect(() => {
    if (imagesLoaded && onReadyForPdf) {
      onReadyForPdf();
    }
  }, [imagesLoaded, onReadyForPdf]);

  // Helper to get Tailwind classes for width/min-height for UI preview
  const getPreviewPageClasses = (layoutSize: "Letter" | "A4" | "A5" | undefined) => {
    switch (layoutSize) {
      case "Letter":
        return "w-letter min-h-letter";
      case "A5":
        return "w-a5 min-h-a5";
      case "A4":
      default:
        return "w-a4 min-h-a4";
    }
  };

  return (
    <div
      className={cn(
        "bg-white text-gray-900",
        !isPdfGeneration && "mx-auto rounded-lg shadow-lg", // Apply full styling for UI preview
        !isPdfGeneration && getPreviewPageClasses(reportDesignSettings.defaultReportPaperSize) // width/min-height for UI preview
      )}
      style={isPdfGeneration ? {
        ...printStyles, // fontSize from utils
        padding: '10mm', // Explicit internal padding for PDF
        border: 'none', // No border for PDF generation, will be drawn programmatically
        boxShadow: 'none', // Ensure no shadow in print/PDF
      } : {
        // UI preview styles
        padding: '24px', // Consistent padding for UI preview
        fontSize: printStyles.fontSize,
        border: '1px solid #ccc',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Report Header with Company Details */}
      {(reportDesignSettings.includeCompanyLogo && companyLogoUrl) || reportDesignSettings.includeCompanyDetails ? (
        <div className="flex justify-between items-start mb-6 print:mb-8">
          {reportDesignSettings.includeCompanyLogo && companyLogoUrl && (
            <img
              ref={el => { if (el) imageRefs.current.push(el); }}
              src={companyLogoUrl}
              alt="Company Logo"
              style={{ width: companyLogoWidth, height: companyLogoHeight, objectFit: companyLogoFit }}
              className="rounded-md flex-shrink-0 print:w-[60px] print:h-[60px]"
            />
          )}
          {reportDesignSettings.includeCompanyDetails && (
            <div className="text-right text-[13px] print:text-[13px] w-full" style={{ fontSize: `${baseFontSizePx * 0.9}px` }}>
              <h2 className="text-md font-bold print:text-lg" style={{ fontSize: `${baseFontSizePx * 1.2}px` }}>{displayCompanyName}</h2>
              {companyTradingName && companyTradingName !== companyLegalName && (
                <p className="text-[13px] print:text-[13px]" style={{ fontSize: `${baseFontSizePx * 1}px` }}>{companyTradingName}</p>
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

      <h3 className="text-lg font-bold text-center mb-4 print:text-xl print:mb-6" style={{ fontSize: `${baseFontSizePx * 1.3}px`, marginBottom: `${baseFontSizePx * 1}px` }}>{reportTitle}</h3>

      {/* Report Content */}
      <div
        dangerouslySetInnerHTML={{ __html: reportContent }}
        style={{ fontSize: `${reportDesignSettings.reportContentFontSize}px` }}
      />
    </div>
  );
};

export default ReportContentWrapper;