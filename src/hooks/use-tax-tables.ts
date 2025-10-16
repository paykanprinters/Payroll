"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

// Define interfaces for fetched tax data
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

export interface TaxTables {
  payeBrackets: TaxBracketPAYE[];
  uifSdlRates: TaxRatesUIFSDL | null;
}

// Define mock tax tables for when mock data is enabled
const mockTaxTables: TaxTables = {
  payeBrackets: [
    { min_income: 0, max_income: 237100, rate: 0.18, deduction: 0 },
    { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
    { min_income: 370501, max_income: 512800, rate: 0.31, deduction: 77362 },
    { min_income: 512801, max_income: 673100, rate: 0.36, deduction: 121424 },
    { min_income: 673101, max_income: 857900, rate: 0.41, deduction: 179147 },
    { min_income: 857901, max_income: 1817000, rate: 0.45, deduction: 255073 },
    { min_income: 1817001, max_income: null, rate: 0.45, deduction: 681403 },
  ],
  uifSdlRates: {
    uif_rate: 0.01,
    uif_cap: 177.12, // Monthly cap
    sdl_rate: 0.01,
  },
};

export const useTaxTables = (isMockDataEnabled: boolean) => {
  const [taxTables, setTaxTables] = useState<TaxTables | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLiveTaxTables = useCallback(async (year: number) => {
    setIsLoading(true);
    try {
      console.log("useTaxTables: Fetching live tax tables from Supabase for year:", year);
      const { data: payeData, error: payeError } = await supabase
        .from('tax_brackets_paye')
        .select('*')
        .eq('tax_year', year)
        .order('min_income', { ascending: true });

      const { data: uifSdlData, error: uifSdlError } = await supabase
        .from('tax_rates_uif_sdl')
        .select('*')
        .eq('tax_year', year)
        .single();

      if (payeError || uifSdlError) {
        console.error("useTaxTables: Error fetching live tax tables:", payeError || uifSdlError);
        setTaxTables(null);
        showError("Failed to load live tax tables for payroll calculations.");
      } else {
        setTaxTables({
          payeBrackets: payeData || [],
          uifSdlRates: uifSdlData || null,
        });
        console.log(`useTaxTables: Live tax tables for ${year} loaded successfully.`);
      }
    } catch (err) {
      console.error("useTaxTables: Unhandled error fetching live tax tables:", err);
      showError("An unexpected error occurred while loading live tax tables.");
      setTaxTables(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMockDataEnabled) {
      setTaxTables(mockTaxTables);
      setIsLoading(false);
    } else {
      const currentTaxYear = new Date().getFullYear(); // Or determine based on fiscal year
      fetchLiveTaxTables(currentTaxYear);

      const handleTaxTablesUpdate = () => {
        fetchLiveTaxTables(currentTaxYear); // Re-fetch if the event is triggered
      };

      window.addEventListener('taxTablesUpdated', handleTaxTablesUpdate);
      return () => {
        window.removeEventListener('taxTablesUpdated', handleTaxTablesUpdate);
      };
    }
  }, [isMockDataEnabled, fetchLiveTaxTables]);

  return {
    taxTables,
    isLoadingTaxTables: isLoading,
    refetchTaxTables: fetchLiveTaxTables, // Expose refetch for manual trigger
  };
};