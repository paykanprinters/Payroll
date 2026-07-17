"use client";

import { supabase } from "@/integrations/supabase/client";

export const createRunSnapshot = async (
  runId: string,
  snapshotType: 'Approved' | 'Locked',
  data: Record<string, unknown>
): Promise<boolean> => {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes?.user?.id || null;

  const payload = {
    run_id: runId,
    user_id: userId,
    snapshot_type: snapshotType,
    data,
  };

  const { error } = await supabase.from('run_snapshots').insert(payload);
  if (error) {
    console.error("run-snapshot-queries: createRunSnapshot error", error);
    return false;
  }
  return true;
};