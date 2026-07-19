import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { DEFAULT_REPORT_DESIGN_SETTINGS } from "@/lib/report-design-interfaces";

export type ReportSheetChrome = {
  showPageBorder: boolean;
  pageBorderRadiusPx: number;
  pageSheetInsetMm: number;
  pageContentPaddingMm: number;
  pageBorderWidthPx: number;
};

export function getReportSheetChrome(
  settings?: Partial<ReportDesignSettings> | ReportSheetChrome | null
): ReportSheetChrome {
  const s = { ...DEFAULT_REPORT_DESIGN_SETTINGS, ...(settings || {}) };
  return {
    showPageBorder: s.showPageBorder,
    pageBorderRadiusPx: s.pageBorderRadiusPx,
    pageSheetInsetMm: s.pageSheetInsetMm,
    pageContentPaddingMm: s.pageContentPaddingMm,
    pageBorderWidthPx: s.pageBorderWidthPx,
  };
}

export function getReportSheetBorderCss(chrome: ReportSheetChrome): string {
  if (!chrome.showPageBorder) return "none";
  return `${chrome.pageBorderWidthPx}px solid #94a3b8`;
}

/** Usable content height inside one sheet (paper − inset×2 − padding×2). */
export function getReportSheetInnerHeightMm(
  paperHeightMm: number,
  settings?: Partial<ReportDesignSettings> | ReportSheetChrome | null
): number {
  const chrome = getReportSheetChrome(settings);
  return Math.max(
    80,
    paperHeightMm - chrome.pageSheetInsetMm * 2 - chrome.pageContentPaddingMm * 2
  );
}

export function getReportSheetOuterHeightMm(
  paperHeightMm: number,
  settings?: Partial<ReportDesignSettings> | ReportSheetChrome | null
): number {
  const chrome = getReportSheetChrome(settings);
  return Math.max(100, paperHeightMm - chrome.pageSheetInsetMm * 2);
}

export function getReportSheetOuterWidthMm(
  paperWidthMm: number,
  settings?: Partial<ReportDesignSettings> | ReportSheetChrome | null
): number {
  const chrome = getReportSheetChrome(settings);
  return Math.max(80, paperWidthMm - chrome.pageSheetInsetMm * 2);
}
