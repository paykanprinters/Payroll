"use client";

import { supabase } from "@/integrations/supabase/client";
import type { UserLabel } from "@/lib/user-display";
import { logger, toLogError } from "@/lib/logger";

export const fetchUserLabels = async (
  ids: Array<string | null | undefined>
): Promise<Map<string, UserLabel>> => {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const labels = new Map<string, UserLabel>();
  if (unique.length === 0) return labels;

  const { data, error } = await supabase.from("users").select("id, name, email").in("id", unique);
  if (error) {
    logger.error("user-queries: fetchUserLabels error", toLogError(error));
    return labels;
  }

  for (const row of data || []) {
    labels.set(row.id, { name: row.name, email: row.email });
  }
  return labels;
};
