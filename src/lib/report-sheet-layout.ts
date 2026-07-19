/** Visual page frame for paginated reports (preview + print/PDF). */
export const REPORT_SHEET_BORDER_RADIUS_PX = 12;
export const REPORT_SHEET_PADDING_MM = 8;
export const REPORT_PAGE_MARGIN_MM = 8;
export const REPORT_SHEET_BORDER = "1.5px solid #94a3b8";

/** Usable content height inside one sheet (paper height − page margins − padding×2). */
export function getReportSheetInnerHeightMm(paperHeightMm: number): number {
  return Math.max(
    80,
    paperHeightMm - REPORT_PAGE_MARGIN_MM * 2 - REPORT_SHEET_PADDING_MM * 2
  );
}

export function getReportSheetOuterHeightMm(paperHeightMm: number): number {
  return Math.max(100, paperHeightMm - REPORT_PAGE_MARGIN_MM * 2);
}

export function getReportSheetOuterWidthMm(paperWidthMm: number): number {
  return Math.max(80, paperWidthMm - REPORT_PAGE_MARGIN_MM * 2);
}
