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

const SIZE_EPSILON_PX = 2;
const SCALE_EPSILON = 0.005;

/**
 * Live design preview: real report chrome on a physical paper sheet,
 * scaled to fit so A4 / Letter / A5 proportions are obvious.
 *
 * Scale is derived from a fixed viewport box (overflow hidden) so ResizeObserver
 * cannot fight scrollbars / animated layout and vibrate the page.
 */
const ReportDesignPreview: React.FC<Props> = ({ settings, companyDetails, className }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastMeasureRef = useRef({ width: 0, height: 0 });
  const [scale, setScale] = useState(0.45);
  const paper = getReportPaper(settings.defaultReportPaperSize);
  const sampleHtml = useMemo(() => buildReportDesignSampleHtml(), []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const applySize = (width: number, height: number) => {
      const w = Math.round(width);
      const h = Math.round(height);
      if (w < 1 || h < 1) return;

      const prev = lastMeasureRef.current;
      if (
        Math.abs(w - prev.width) < SIZE_EPSILON_PX &&
        Math.abs(h - prev.height) < SIZE_EPSILON_PX
      ) {
        return;
      }
      lastMeasureRef.current = { width: w, height: h };

      const next = Math.round(fitPaperScaleToA4Reference(w, h, 32) * 1000) / 1000;
      setScale((current) => (Math.abs(current - next) < SCALE_EPSILON ? current : next));
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applySize(entry.contentRect.width, entry.contentRect.height);
    });

    ro.observe(el);
    applySize(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const scaledWidthMm = paper.width * scale;
  const scaledHeightMm = paper.height * scale;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Live page · <span className="font-semibold text-foreground">{paper.label}</span>{" "}
          ({paper.subtitle}) · {Math.round(scale * 100)}% scale
        </span>
        <span>Font {settings.reportContentFontSize}px</span>
      </div>

      {/* Fixed-height, overflow-hidden viewport — never toggles scrollbars when scale changes */}
      <div
        ref={viewportRef}
        className="relative flex h-[min(70vh,640px)] min-h-[480px] items-start justify-center overflow-hidden rounded-md border bg-[linear-gradient(135deg,#e8ecf1_0%,#f4f6f8_50%,#e5e9ef_100%)] p-4"
      >
        <div
          key={settings.defaultReportPaperSize}
          className="relative shrink-0"
          style={{
            width: `${scaledWidthMm}mm`,
            height: `${scaledHeightMm}mm`,
          }}
        >
          <div
            className="origin-top-left"
            style={{
              width: `${paper.width}mm`,
              minHeight: `${paper.height}mm`,
              transform: `scale(${scale})`,
            }}
          >
            <div className="overflow-hidden ring-1 ring-black/15">
              <ReportContentWrapper
                reportTitle="Payroll Summary Report"
                reportContent={sampleHtml}
                companyDetails={companyDetails}
                reportDesignSettings={settings}
                constrainToParent={false}
                chrome="sheet"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesignPreview;
