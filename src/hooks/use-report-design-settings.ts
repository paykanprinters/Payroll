"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_REPORT_DESIGN_SETTINGS,
  readReportDesignSettingsFromLocalStorage,
  writeReportDesignSettingsToLocalStorage,
  type ReportDesignSettings,
} from "@/lib/report-design-interfaces";
import {
  fetchReportDesignSettings,
  upsertReportDesignSettings,
} from "@/integrations/supabase/report-design-settings-queries";
import { useAuth } from "@/hooks/use-auth";
import { showError, showSuccess } from "@/utils/toast";

export function useReportDesignSettings() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [settings, setSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    if (isLoadingAuth) return;

    // Always migrate/read local cache first for instant UI.
    const local = readReportDesignSettingsFromLocalStorage();
    setSettings(local);

    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    try {
      const remote = await fetchReportDesignSettings();
      if (!remote) {
        // No server row (or load failed): keep migrated local cache.
        return;
      }
      const next = {
        ...local,
        ...remote,
        // IRP5 font may also be owned by Tax Liabilities; prefer remote when present.
        irp5ContentFontSize: remote.irp5ContentFontSize ?? local.irp5ContentFontSize,
      };
      setSettings(next);
      writeReportDesignSettingsToLocalStorage(next);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isLoadingAuth]);

  useEffect(() => {
    void loadSettings();
    const handler = () => {
      void loadSettings();
    };
    window.addEventListener("reportDesignUpdated", handler);
    return () => window.removeEventListener("reportDesignUpdated", handler);
  }, [loadSettings]);

  const save = useCallback(
    async (next: ReportDesignSettings) => {
      writeReportDesignSettingsToLocalStorage(next);
      setSettings(next);

      if (!isAuthenticated) {
        window.dispatchEvent(new Event("reportDesignUpdated"));
        showSuccess("Report design settings saved locally.");
        return true;
      }

      const ok = await upsertReportDesignSettings(next);
      if (ok) {
        window.dispatchEvent(new Event("reportDesignUpdated"));
        showSuccess("Report design settings saved.");
        return true;
      }
      showError("Could not save report design settings to the server.");
      return false;
    },
    [isAuthenticated]
  );

  return { settings, setSettings, isLoading, reload: loadSettings, save };
}

export default useReportDesignSettings;
