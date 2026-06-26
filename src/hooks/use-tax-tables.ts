"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { getSarsTaxTablesForYear, buildSarsTaxYearDetails } from "@/lib/sars-tax-tables";
import {
  validateLoadedTaxTables,
  type TaxTableValidationResult,
} from "@/lib/tax-tables-validation";
import { logger } from "@/lib/logger";

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

function buildMockTaxTables(year: number): TaxTables {
  const sars = getSarsTaxTablesForYear(year) ?? getSarsTaxTablesForYear(2027)!;
  const taxYearDetails = buildSarsTaxYearDetails(year) ?? buildSarsTaxYearDetails(2027)!;
  return {
    payeBrackets: sars.payeBrackets,
    uifSdlRates: sars.uifSdlRates,
    taxYearDetails,
  };
}

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
    logger.warn("useTaxTables: UIF/SDL rates missing for year", taxYear);
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

  const taxTables = isMockDataEnabled
    ? buildMockTaxTables(activeTaxYear)
    : data ?? null;

  const taxTableValidation: TaxTableValidationResult = useMemo(
    () =>
      validateLoadedTaxTables(taxTables, activeTaxYear, {
        isLoading: enabled && isLoading,
      }),
    [taxTables, activeTaxYear, enabled, isLoading]
  );

  return {
    taxTables,
    taxTableValidation,
    isTaxTablesReady: taxTableValidation.isReady,
    isLoadingTaxTables: isLoadingAuth || (enabled && isLoading),
    refetchTaxTables,
  };
};
