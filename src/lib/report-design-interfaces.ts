export interface ReportDesignSettings {
  defaultReportPaperSize: "Letter" | "A4" | "A5";
  includeCompanyLogo: boolean;
  includeCompanyDetails: boolean;
  reportContentFontSize: number;
  /** IRP5 certificate font; primarily owned by Tax Liabilities settings. */
  irp5ContentFontSize: number;
  /** Draw a border around each paginated report sheet. */
  showPageBorder: boolean;
  /** Corner radius (px) for each sheet frame. 0 = square. */
  pageBorderRadiusPx: number;
  /** Distance from paper edge to the sheet border (mm). */
  pageSheetInsetMm: number;
  /** Padding inside the sheet border (mm). */
  pageContentPaddingMm: number;
  /** Sheet border stroke width (px). */
  pageBorderWidthPx: number;
}

export const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
  showPageBorder: true,
  pageBorderRadiusPx: 12,
  pageSheetInsetMm: 8,
  pageContentPaddingMm: 8,
  pageBorderWidthPx: 1.5,
};

export const REPORT_DESIGN_STORAGE_KEY = "reportDesignSettings";

/** Legacy fragmented keys written by older Report Design UI. */
export const LEGACY_REPORT_DESIGN_KEYS = [
  "reportDesignPaperSize",
  "reportDesignIncludeLogo",
  "reportDesignIncludeDetails",
  "reportDesignFontSize",
] as const;

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Normalize and clamp chrome fields after merge. */
export function normalizeReportDesignSettings(settings: ReportDesignSettings): ReportDesignSettings {
  return {
    ...settings,
    reportContentFontSize: clamp(settings.reportContentFontSize, 10, 20),
    irp5ContentFontSize: clamp(settings.irp5ContentFontSize, 8, 18),
    pageBorderRadiusPx: clamp(Math.round(settings.pageBorderRadiusPx), 0, 28),
    pageSheetInsetMm: clamp(Number(settings.pageSheetInsetMm), 2, 24),
    pageContentPaddingMm: clamp(Number(settings.pageContentPaddingMm), 4, 20),
    pageBorderWidthPx: clamp(Number(settings.pageBorderWidthPx), 0.5, 4),
    showPageBorder: Boolean(settings.showPageBorder),
  };
}

export function mergeReportDesignSettings(
  partial?: Partial<ReportDesignSettings> | null
): ReportDesignSettings {
  return normalizeReportDesignSettings({
    ...DEFAULT_REPORT_DESIGN_SETTINGS,
    ...(partial || {}),
  });
}

/** Read settings from unified localStorage, migrating legacy fragmented keys once. */
export function readReportDesignSettingsFromLocalStorage(): ReportDesignSettings {
  try {
    const unified = localStorage.getItem(REPORT_DESIGN_STORAGE_KEY);
    if (unified) {
      return mergeReportDesignSettings(JSON.parse(unified) as Partial<ReportDesignSettings>);
    }
  } catch {
    // fall through to legacy
  }

  const fromLegacy: Partial<ReportDesignSettings> = {};
  try {
    const paper = localStorage.getItem("reportDesignPaperSize");
    if (paper === "Letter" || paper === "A4" || paper === "A5") {
      fromLegacy.defaultReportPaperSize = paper;
    }
    const logo = localStorage.getItem("reportDesignIncludeLogo");
    if (logo !== null) fromLegacy.includeCompanyLogo = JSON.parse(logo);
    const details = localStorage.getItem("reportDesignIncludeDetails");
    if (details !== null) fromLegacy.includeCompanyDetails = JSON.parse(details);
    const font = localStorage.getItem("reportDesignFontSize");
    if (font) {
      const n = parseFloat(font);
      if (!Number.isNaN(n)) fromLegacy.reportContentFontSize = n;
    }
  } catch {
    // ignore
  }

  const merged = mergeReportDesignSettings(fromLegacy);
  try {
    localStorage.setItem(REPORT_DESIGN_STORAGE_KEY, JSON.stringify(merged));
    for (const key of LEGACY_REPORT_DESIGN_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  return merged;
}

export function writeReportDesignSettingsToLocalStorage(settings: ReportDesignSettings): void {
  localStorage.setItem(
    REPORT_DESIGN_STORAGE_KEY,
    JSON.stringify(normalizeReportDesignSettings(settings))
  );
  for (const key of LEGACY_REPORT_DESIGN_KEYS) {
    localStorage.removeItem(key);
  }
}
