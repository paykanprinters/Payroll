"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

export function useReportDesignSettings() {
  const [settings, setSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const loadSettings = useCallback(() => {
    const saved = localStorage.getItem("reportDesignSettings");
    if (saved) {
      try {
        setSettings({ ...DEFAULT_REPORT_DESIGN_SETTINGS, ...JSON.parse(saved) });
        return;
      } catch {
        // fall through
      }
    }
    localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
    setSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
  }, []);

  useEffect(() => {
    loadSettings();
    const handler = () => loadSettings();
    window.addEventListener("reportDesignUpdated", handler);
    return () => window.removeEventListener("reportDesignUpdated", handler);
  }, [loadSettings]);

  return { settings, reload: loadSettings };
}
