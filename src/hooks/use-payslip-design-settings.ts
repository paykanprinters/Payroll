"use client";

import { useEffect, useState, useCallback } from "react";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { fetchPayslipDesignSettings, upsertPayslipDesignSettings } from "@/integrations/supabase/payslip-design-settings-queries";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/utils/toast";

const DEFAULT_SETTINGS: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true,
  showBankDetails: true,
  showYTD: true,
  showHourlyRate: true,
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
  payslipLogoUrl: "",
  payslipLogoWidth: 100,
  payslipLogoHeight: 50,
  payslipLogoFit: "contain",
};

export function usePayslipDesignSettings() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [settings, setSettings] = useState<PayslipDesignSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const load = useCallback(async () => {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      setSettings(DEFAULT_SETTINGS);
      return;
    }
    setIsLoading(true);
    const s = await fetchPayslipDesignSettings();
    setSettings(s);
    setIsLoading(false);
  }, [isAuthenticated, isLoadingAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (next: PayslipDesignSettings) => {
    const ok = await upsertPayslipDesignSettings(next);
    if (ok) {
      setSettings(next);
      window.dispatchEvent(new Event("payslipDesignUpdated"));
      showSuccess("Payslip design settings saved.");
      return true;
    } else {
      showError("Could not save payslip design settings.");
      return false;
    }
  }, []);

  return { settings, setSettings, isLoading, reload: load, save };
}

export default usePayslipDesignSettings;