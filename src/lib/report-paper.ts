/** Physical paper sizes used by report preview / PDF. */
export const REPORT_PAPER_MM = {
  A4: { width: 210, height: 297, label: "A4", subtitle: "210 × 297 mm" },
  A5: { width: 148, height: 210, label: "A5", subtitle: "148 × 210 mm" },
  Letter: { width: 215.9, height: 279.4, label: "US Letter", subtitle: "8.5 × 11 in" },
} as const;

export type ReportPaperSize = keyof typeof REPORT_PAPER_MM;
export type ReportPageOrientation = "portrait" | "landscape";

export function getReportPaper(size: ReportPaperSize | undefined) {
  return REPORT_PAPER_MM[size || "A4"];
}

/** Portrait/landscape page box in mm for the selected paper stock. */
export function getOrientedPaperMm(
  size: ReportPaperSize | undefined,
  orientation: ReportPageOrientation = "portrait"
): { width: number; height: number } {
  const paper = getReportPaper(size);
  if (orientation === "landscape") {
    return { width: paper.height, height: paper.width };
  }
  return { width: paper.width, height: paper.height };
}

/** Tailwind preview page classes matching physical paper (portrait only). */
export function getReportPreviewPageClasses(size: ReportPaperSize | undefined): string {
  switch (size) {
    case "Letter":
      return "w-letter min-h-letter";
    case "A5":
      return "w-a5 min-h-a5";
    case "A4":
    default:
      return "w-a4 min-h-a4";
  }
}

/**
 * Scale factor that fits an A4 sheet in the viewport.
 * Apply the same factor to every paper size so A5 stays visibly smaller than A4/Letter
 * (ISO sizes share aspect ratio — per-sheet max-fit would make them identical).
 */
export function fitPaperScaleToA4Reference(
  viewportWidthPx: number,
  viewportHeightPx: number,
  paddingPx = 32
): number {
  return fitPaperScale(
    REPORT_PAPER_MM.A4.width,
    REPORT_PAPER_MM.A4.height,
    viewportWidthPx,
    viewportHeightPx,
    paddingPx
  );
}

/**
 * Fit paper WIDTH into the viewport (height may scroll).
 * Prevents the landscape clipping that made report previews look cut off.
 */
export function fitPaperScaleToWidth(
  paperWidthMm: number,
  viewportWidthPx: number,
  paddingPx = 32
): number {
  const availW = Math.max(120, viewportWidthPx - paddingPx);
  const pxPerMm = 96 / 25.4;
  const paperWpx = paperWidthMm * pxPerMm;
  const raw = Math.min(1, availW / paperWpx);
  return Math.round(raw * 1000) / 1000;
}

/**
 * Fit a paper sheet into a viewport while preserving aspect ratio.
 */
export function fitPaperScale(
  paperWidthMm: number,
  paperHeightMm: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
  paddingPx = 32
): number {
  const availW = Math.max(120, viewportWidthPx - paddingPx);
  const availH = Math.max(160, viewportHeightPx - paddingPx);
  // ~3.78 px/mm at 96dpi
  const pxPerMm = 96 / 25.4;
  const paperWpx = paperWidthMm * pxPerMm;
  const paperHpx = paperHeightMm * pxPerMm;
  const raw = Math.min(1, availW / paperWpx, availH / paperHpx);
  // Quantize to avoid sub-pixel thrash between near-identical scales.
  return Math.round(raw * 1000) / 1000;
}
