"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOvertimeRules, upsertOvertimeRules, OvertimePremiumRules } from "@/integrations/supabase/overtime-rules-queries";

export const useOvertimeRules = () => {
  const [rules, setRules] = useState<OvertimePremiumRules | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetchOvertimeRules();
      setRules(r);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveRules = useCallback(async (payload: Partial<OvertimePremiumRules>) => {
    setIsLoading(true);
    try {
      const r = await upsertOvertimeRules(payload);
      if (r) setRules(r);
      return r;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rules, isLoading, refetch, saveRules };
};

export type { OvertimePremiumRules } from "@/integrations/supabase/overtime-rules-queries";