"use client";

import { supabase } from "@/integrations/supabase/client";
import { keysToCamelCase, keysToSnakeCase } from "@/lib/case-converters";
import { showError, showSuccess } from "@/utils/toast";

export interface OvertimePremiumRules {
  id?: string;
  userId?: string | null;
  weekdayOtMultiplier: number;
  saturdayOtMultiplier: number;
  sundayOtMultiplier: number;
  holidayWorkedMultiplier: number;
  holidayNonWorkedMultiplier: number;
  nightShiftStart?: string | null;
  nightShiftEnd?: string | null;
  nightShiftMultiplier?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const toCamel = (value: unknown): unknown => keysToCamelCase(value);
const toSnake = keysToSnakeCase;

export const fetchOvertimeRules = async (): Promise<OvertimePremiumRules | null> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("overtime_rules")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("overtime-rules-queries: fetchOvertimeRules", error);
    showError("Failed to load overtime rules.");
    return null;
  }
  return data ? (toCamel(data) as OvertimePremiumRules) : null;
};

export const upsertOvertimeRules = async (payload: Partial<OvertimePremiumRules>): Promise<OvertimePremiumRules | null> => {
  const { data: session } = await supabase.auth.getUser();
  const userId = session?.user?.id;
  if (!userId) {
    showError("User not authenticated.");
    return null;
  }

  const snake = toSnake({
    ...payload,
    userId,
  });

  const { data, error } = await supabase
    .from("overtime_rules")
    .upsert(snake, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("overtime-rules-queries: upsertOvertimeRules", error);
    showError(`Failed to save overtime rules: ${error.message}`);
    return null;
  }
  showSuccess("Overtime rules saved.");
  return toCamel(data) as OvertimePremiumRules;
};