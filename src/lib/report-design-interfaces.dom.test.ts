import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_REPORT_DESIGN_SETTINGS,
  readReportDesignSettingsFromLocalStorage,
  writeReportDesignSettingsToLocalStorage,
  REPORT_DESIGN_STORAGE_KEY,
} from "@/lib/report-design-interfaces";

describe("report design persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("migrates legacy fragmented keys into the unified blob", () => {
    localStorage.setItem("reportDesignPaperSize", "Letter");
    localStorage.setItem("reportDesignIncludeLogo", "false");
    localStorage.setItem("reportDesignIncludeDetails", "true");
    localStorage.setItem("reportDesignFontSize", "16");

    const settings = readReportDesignSettingsFromLocalStorage();
    expect(settings.defaultReportPaperSize).toBe("Letter");
    expect(settings.includeCompanyLogo).toBe(false);
    expect(settings.includeCompanyDetails).toBe(true);
    expect(settings.reportContentFontSize).toBe(16);
    expect(localStorage.getItem(REPORT_DESIGN_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem("reportDesignPaperSize")).toBeNull();
  });

  it("round-trips unified settings", () => {
    const next = {
      ...DEFAULT_REPORT_DESIGN_SETTINGS,
      defaultReportPaperSize: "A5" as const,
      reportContentFontSize: 12,
      includeCompanyDetails: false,
    };
    writeReportDesignSettingsToLocalStorage(next);
    expect(readReportDesignSettingsFromLocalStorage()).toEqual(next);
  });
});
