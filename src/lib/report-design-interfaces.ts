export interface ReportDesignSettings {
  defaultReportPaperSize: "Letter" | "A4" | "A5";
  includeCompanyLogo: boolean;
  includeCompanyDetails: boolean;
  reportContentFontSize: number;
  /** IRP5 certificate font; primarily owned by Tax Liabilities settings. */
  irp5ContentFontSize: number;
}

export const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

export const REPORT_DESIGN_STORAGE_KEY = "reportDesignSettings";

/** Legacy fragmented keys written by older Report Design UI. */
export const LEGACY_REPORT_DESIGN_KEYS = [
  "reportDesignPaperSize",
  "reportDesignIncludeLogo",
  "reportDesignIncludeDetails",
  "reportDesignFontSize",
] as const;

export function mergeReportDesignSettings(
  partial?: Partial<ReportDesignSettings> | null
): ReportDesignSettings {
  return { ...DEFAULT_REPORT_DESIGN_SETTINGS, ...(partial || {}) };
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
  localStorage.setItem(REPORT_DESIGN_STORAGE_KEY, JSON.stringify(settings));
  for (const key of LEGACY_REPORT_DESIGN_KEYS) {
    localStorage.removeItem(key);
  }
}
