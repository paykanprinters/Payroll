"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface TaxBracketPAYE {
  min_income: number;
  max_income: number | null;
  rate: number;
  deduction: number;
}

interface TaxRatesUIFSDL {
  uif_rate: number;
  uif_cap: number;
  sdl_rate: number;
}

interface TaxYearDetails {
  year: number;
  start_date: string;
  end_date: string;
  description: string | null;
  rebates: {
    under65: number;
    sixtyFiveToSeventyFour: number;
    seventyFivePlus: number;
  };
}

export interface TaxTables {
  payeBrackets: TaxBracketPAYE[];
  uifSdlRates: TaxRatesUIFSDL | null;
  taxYearDetails: TaxYearDetails | null;
}

const mockTaxTables: TaxTables = {
  payeBrackets: [
    { min_income: 1, max_income: 237100, rate: 0.18, deduction: 0 },
    { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
    { min_income: 370501, max_income: 512800, rate: 0.31, deduction: 77362 },
    { min_income: 512801, max_income: 673000, rate: 0.36, deduction: 121475 },
    { min_income: 673001, max_income: 857900, rate: 0.39, deduction: 179147 },
    { min_income: 857901, max_income: 1817000, rate: 0.41, deduction: 251258 },
    { min_income: 1817001, max_income: null, rate: 0.45, deduction: 644489 },
  ],
  uifSdlRates: {
    uif_rate: 0.01,
    uif_cap: 177.12,
    sdl_rate: 0.01,
  },
  taxYearDetails: {
    year: new Date().getFullYear(),
    start_date: `${new Date().getFullYear()}-03-01`,
    end_date: `${new Date().getFullYear() + 1}-02-28`,
    description: "SARS Tax Year (Mock Data)",
    rebates: {
      under65: 16425,
      sixtyFiveToSeventyFour: 9033,
      seventyFivePlus: 2994,
    },
  },
};

interface UseTaxTablesProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  activeTaxYear: number;
}

export const useTaxTables = ({ isMockDataEnabled, isAuthenticated, isLoadingAuth, activeTaxYear }: UseTaxTablesProps) => {
  const [taxTables, setTaxTables] = useState<TaxTables | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLiveTaxTables = useCallback(async (year: number) => {
    setIsLoading(true);
    try {
      console.log("useTaxTables: Fetching live tax tables from Supabase for year:", year);

      // PAYE brackets: empty array when none found (no error)
      const { data: payeData, error: payeError } = await supabase
        .from("tax_brackets_paye")
        .select("*")
        .eq("tax_year", year)
        .order("min_income", { ascending: true });

      // UIF/SDL: use maybeSingle to avoid error when not found
      const { data: uifSdlData, error: uifSdlError } = await supabase
        .from("tax_rates_uif_sdl")
        .select("*")
        .eq("tax_year", year)
        .maybeSingle();

      // Tax year details: use maybeSingle to avoid error when not found
      const { data: taxYearDetailsData, error: taxYearDetailsError } = await supabase
        .from("tax_years")
        .select("*")
        .eq("year", year)
        .maybeSingle();

      // Treat "no rows found" gracefully; only fail on real query errors
      const isRealError = (err: any) =>
        !!err && !(typeof err.code === "string" && err.code === "PGRST116");

      if (isRealError(payeError) || isRealError(uifSdlError) || isRealError(taxYearDetailsError)) {
        console.error("useTaxTables: Error fetching live tax tables:", payeError || uifSdlError || taxYearDetailsError);
        setTaxTables({
          payeBrackets: [],
          uifSdlRates: null,
          taxYearDetails: null,
        });
        showError("Failed to fully load tax tables; proceeding with defaults.");
      } else {
        setTaxTables({
          payeBrackets: Array.isArray(payeData) ? payeData : [],
          uifSdlRates: uifSdlData ?? null,
          taxYearDetails: (taxYearDetailsData as TaxYearDetails) ?? null,
        });
        console.log(`useTaxTables: Live tax tables for ${year} loaded (len=${(payeData || []).length}).`);
      }
    } catch (err) {
      console.error("useTaxTables: Unhandled error fetching live tax tables:", err);
      showError("An unexpected error occurred while loading tax tables; proceeding with defaults.");
      setTaxTables({
        payeBrackets: [],
        uifSdlRates: null,
        taxYearDetails: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    if (isAuthenticated) {
      fetchLiveTaxTables(activeTaxYear);
      const handleTaxTablesUpdate = () => {
        fetchLiveTaxTables(activeTaxYear);
      };
      window.addEventListener("taxTablesUpdated", handleTaxTablesUpdate);
      return () => {
        window.removeEventListener("taxTablesUpdated", handleTaxTablesUpdate);
      };
    } else if (isMockDataEnabled) {
      setTaxTables(mockTaxTables);
      setIsLoading(false);
    } else {
      // Not authenticated and not mock: still provide defaults so payroll can render
      setTaxTables({
        payeBrackets: [],
        uifSdlRates: null,
        taxYearDetails: null,
      });
      setIsLoading(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, fetchLiveTaxTables, activeTaxYear]);

  return {
    taxTables,
    isLoadingTaxTables: isLoading,
    refetchTaxTables: fetchLiveTaxTables,
  };
};