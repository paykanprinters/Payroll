"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import type { ReportPageOrientation } from "@/lib/report-paper";
import { fitPaperScaleToWidth, getOrientedPaperMm, getReportPaper } from "@/lib/report-paper";
import { buildReportPrintDocumentHtml } from "@/lib/report-print-html";
import { getReportSheetOuterHeightMm } from "@/lib/report-sheet-layout";

type Props = {
  reportTitle: string;
  reportContentHtml: string;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  orientation: ReportPageOrientation;
  className?: string;
};

const SIZE_EPSILON_PX = 2;
const SCALE_EPSILON = 0.005;

/**
 * Preview that loads the same print HTML (with sheet pagination) in an iframe
 * so each page shows as its own rounded sheet.
 */
const ReportPagedPreview: React.FC<Props> = ({
  reportTitle,
  reportContentHtml,
  companyDetails,
  reportDesignSettings,
  orientation,
  className,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastWidthRef = useRef(0);
  const [scale, setScale] = useState(0.45);
  const [sheetCount, setSheetCount] = useState(1);
  const [ready, setReady] = useState(false);

  const paperMeta = getReportPaper(reportDesignSettings.defaultReportPaperSize);
  const oriented = getOrientedPaperMm(reportDesignSettings.defaultReportPaperSize, orientation);
  const sheetOuterH = getReportSheetOuterHeightMm(oriented.height, reportDesignSettings);

  const srcDoc = useMemo(
    () =>
      buildReportPrintDocumentHtml({
        reportTitle,
        reportContentHtml,
        companyDetails,
        reportDesignSettings,
        orientation,
      }),
    [reportTitle, reportContentHtml, companyDetails, reportDesignSettings, orientation]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const applyWidth = (width: number) => {
      const w = Math.round(width);
      if (w < 1) return;
      if (Math.abs(w - lastWidthRef.current) < SIZE_EPSILON_PX) return;
      lastWidthRef.current = w;
      const next = fitPaperScaleToWidth(oriented.width, w, 24);
      setScale((current) => (Math.abs(current - next) < SCALE_EPSILON ? current : next));
    };
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      applyWidth(entry.contentRect.width);
    });
    ro.observe(el);
    applyWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [oriented.width]);

  useEffect(() => {
    setReady(false);
    setSheetCount(1);
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let tries = 0;
    const poll = () => {
      if (cancelled) return;
      tries += 1;
      try {
        const win = iframe.contentWindow as (Window & {
          __REPORT_PAGINATED__?: boolean;
          __REPORT_SHEET_COUNT__?: number;
        }) | null;
        if (win?.__REPORT_PAGINATED__) {
          setSheetCount(Math.max(1, win.__REPORT_SHEET_COUNT__ || 1));
          setReady(true);
          return;
        }
      } catch {
        // cross-origin shouldn't happen with srcDoc
      }
      if (tries < 80) window.setTimeout(poll, 50);
      else setReady(true);
    };

    const onLoad = () => {
      window.setTimeout(poll, 30);
    };
    iframe.addEventListener("load", onLoad);
    return () => {
      cancelled = true;
      iframe.removeEventListener("load", onLoad);
    };
  }, [srcDoc]);

  const scaledWidthMm = oriented.width * scale;
  // Desk padding in the print HTML (~12px) + gap between sheets (~12px each)
  const footprintHeightPx = Math.max(
    200,
    Math.round((sheetOuterH * sheetCount + 8 * Math.max(0, sheetCount - 1) + 24) * (96 / 25.4) * scale)
  );

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {paperMeta.label} · {orientation} · {sheetCount} sheet{sheetCount === 1 ? "" : "s"} ·{" "}
          {Math.round(scale * 100)}% scale
          {!ready ? " · paginating…" : ""}
        </span>
        <span>Each sheet is a page frame; overflow continues on the next</span>
      </div>
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto border bg-[linear-gradient(135deg,#e8ecf1_0%,#f4f6f8_50%,#e5e9ef_100%)] p-3 [scrollbar-gutter:stable]"
      >
        <div
          className="relative mx-auto overflow-hidden"
          style={{ width: `${scaledWidthMm}mm`, height: `${footprintHeightPx}px` }}
        >
          <iframe
            ref={iframeRef}
            title="Report page preview"
            srcDoc={srcDoc}
            className="origin-top-left border-0 bg-transparent"
            style={{
              width: `${oriented.width}mm`,
              height: `${(sheetOuterH * sheetCount + 8 * Math.max(0, sheetCount - 1) + 24) * (96 / 25.4)}px`,
              transform: `scale(${scale})`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReportPagedPreview;
