"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { buildReportDesignSampleHtml } from "@/lib/report-design-sample";
import { fitPaperScaleToA4Reference, getReportPaper } from "@/lib/report-paper";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";

type Props = {
  settings: ReportDesignSettings;
  companyDetails: MockCompanyDetails | null;
  className?: string;
};

/**
 * Live design preview: real report chrome on a physical paper sheet,
 * scaled to fit so A4 / Letter / A5 proportions are obvious.
 */
const ReportDesignPreview: React.FC<Props> = ({ settings, companyDetails, className }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 420, height: 560 });
  const paper = getReportPaper(settings.defaultReportPaperSize);
  const sampleHtml = useMemo(() => buildReportDesignSampleHtml(), []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setViewport({
        width: el.clientWidth || 420,
        height: el.clientHeight || 560,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = fitPaperScaleToA4Reference(viewport.width, viewport.height, 40);
  const scaledWidthMm = paper.width * scale;
  const scaledHeightMm = paper.height * scale;

  return (
    <div className={cn("flex h-full min-h-[520px] flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Live page · <span className="font-semibold text-foreground">{paper.label}</span>{" "}
          ({paper.subtitle}) · {Math.round(scale * 100)}% scale
        </span>
        <span>Font {settings.reportContentFontSize}px</span>
      </div>

      <div
        ref={viewportRef}
        className="relative flex flex-1 items-start justify-center overflow-auto rounded-md border bg-[linear-gradient(135deg,#e8ecf1_0%,#f4f6f8_50%,#e5e9ef_100%)] p-4"
      >
        {/* Layout box = scaled footprint so A5 occupies less space than A4 */}
        <div
          className="relative shrink-0 transition-[width,height] duration-300 ease-out"
          style={{
            width: `${scaledWidthMm}mm`,
            height: `${scaledHeightMm}mm`,
          }}
        >
          <div
            className="origin-top-left transition-transform duration-300 ease-out"
            style={{
              width: `${paper.width}mm`,
              minHeight: `${paper.height}mm`,
              transform: `scale(${scale})`,
            }}
          >
            <div className="overflow-hidden rounded-sm shadow-xl ring-1 ring-black/10">
              <ReportContentWrapper
                reportTitle="Payroll Summary Report"
                reportContent={sampleHtml}
                companyDetails={companyDetails}
                reportDesignSettings={settings}
                constrainToParent={false}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesignPreview;
