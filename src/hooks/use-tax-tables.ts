"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

async function fetchTaxTablesFromDb(year: number): Promise<TaxTables> {
  const { data: payeData, error: payeError } = await supabase
    .from("tax_brackets_paye")
    .select("*")
    .eq("tax_year", year)
    .order("min_income", { ascending: true });

  const { data: uifSdlData, error: uifSdlError } = await supabase
    .from("tax_rates_uif_sdl")
    .select("*")
    .eq("tax_year", year)
    .maybeSingle();

  const { data: taxYearDetailsData, error: taxYearDetailsError } = await supabase
    .from("tax_years")
    .select("*")
    .eq("year", year)
    .maybeSingle();

  if (payeError || taxYearDetailsError) {
    throw new Error(payeError?.message || taxYearDetailsError?.message || "Failed to load tax tables");
  }
  if (uifSdlError) {
    console.warn("useTaxTables: UIF/SDL rates missing for year", year, uifSdlError.message);
  }

  const payeBrackets = payeData || [];
  const taxYearInfo = (taxYearDetailsData as TaxYearDetails) || null;

  if (payeBrackets.length === 0 || !taxYearInfo) {
    throw new Error(`Tax tables for ${year} are incomplete in the database.`);
  }

  return {
    payeBrackets,
    uifSdlRates: uifSdlData || null,
    taxYearDetails: taxYearInfo,
  };
}

interface UseTaxTablesProps {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  activeTaxYear: number;
}

export const useTaxTables = ({
  isMockDataEnabled,
  isAuthenticated,
  isLoadingAuth,
  activeTaxYear,
}: UseTaxTablesProps) => {
  const queryClient = useQueryClient();
  const enabled = !isLoadingAuth && isAuthenticated && !isMockDataEnabled;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["taxTables", activeTaxYear],
    queryFn: () => fetchTaxTablesFromDb(activeTaxYear),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!error || !enabled) return;
    showError(
      error instanceof Error
        ? error.message
        : "Failed to load tax tables. Payroll calculations are blocked until tables are available."
    );
  }, [error, enabled]);

  const refetchTaxTables = useCallback(
    async (year?: number) => {
      const targetYear = year ?? activeTaxYear;
      await queryClient.invalidateQueries({ queryKey: ["taxTables", targetYear] });
      return refetch();
    },
    [activeTaxYear, queryClient, refetch]
  );

  const taxTables =
    isMockDataEnabled && !isAuthenticated
      ? mockTaxTables
      : isMockDataEnabled
        ? mockTaxTables
        : data ?? null;

  return {
    taxTables,
    isLoadingTaxTables: isLoadingAuth || (enabled && isLoading),
    refetchTaxTables,
  };
};
