import { supabase } from "@/integrations/supabase/client";
import { logger, toLogError } from "@/lib/logger";
import { parseFunctionError } from "@/lib/parse-function-error";
import type { CompanyClosure } from "@/lib/company-closure";
import type { LeaveEntry, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { convertLeaveEntryKeysToSnakeCase } from "@/integrations/supabase/leave-queries";
import { convertTimesheetKeysToSnakeCase } from "@/integrations/supabase/timesheet-queries";

type ClosureRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payout_date: string;
  status: CompanyClosure["status"];
  published_at: string | null;
  company_closure_exclusions?: { employee_id: string }[];
};

const rowToClosure = (row: ClosureRow): CompanyClosure => ({
  id: row.id,
  name: row.name,
  startDate: row.start_date,
  endDate: row.end_date,
  payoutDate: row.payout_date,
  status: row.status,
  publishedAt: row.published_at,
  excludedEmployeeIds: (row.company_closure_exclusions || []).map((e) => e.employee_id),
});

export type ClosureResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

const fail = (context: string, error: unknown): { ok: false; error: string } => {
  logger.error(`closure-queries: ${context}`, toLogError(error));
  return { ok: false, error: error instanceof Error ? error.message : (error as { message?: string })?.message || String(error) };
};

export async function fetchClosures(): Promise<CompanyClosure[]> {
  const { data, error } = await supabase
    .from("company_closures")
    .select("*, company_closure_exclusions(employee_id)")
    .order("start_date", { ascending: false });
  if (error) {
    logger.error("closure-queries: fetch failed", toLogError(error));
    return [];
  }
  return ((data || []) as ClosureRow[]).map(rowToClosure);
}

export async function saveClosureDraft(
  closure: Omit<CompanyClosure, "id" | "status" | "publishedAt"> & { id?: string }
): Promise<ClosureResult<CompanyClosure>> {
  const payload = {
    ...(closure.id ? { id: closure.id } : {}),
    name: closure.name.trim(),
    start_date: closure.startDate,
    end_date: closure.endDate,
    payout_date: closure.payoutDate,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("company_closures")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error || !data) return fail("save failed", error);

  const id = (data as ClosureRow).id;
  const { error: clearError } = await supabase.from("company_closure_exclusions").delete().eq("closure_id", id);
  if (clearError) return fail("clear exclusions failed", clearError);
  if (closure.excludedEmployeeIds.length > 0) {
    const { error: exError } = await supabase
      .from("company_closure_exclusions")
      .insert(closure.excludedEmployeeIds.map((employee_id) => ({ closure_id: id, employee_id })));
    if (exError) return fail("save exclusions failed", exError);
  }
  return { ok: true, data: rowToClosure({ ...(data as ClosureRow), company_closure_exclusions: closure.excludedEmployeeIds.map((employee_id) => ({ employee_id })) }) };
}

export async function deleteClosure(id: string): Promise<ClosureResult> {
  const { error } = await supabase.from("company_closures").delete().eq("id", id).eq("status", "draft");
  if (error) return fail("delete failed", error);
  return { ok: true, data: undefined };
}

/** Writes the closure leave and leave timesheets, then marks the closure published. Rolls back on failure. */
export async function publishClosure(
  closureId: string,
  leaveRecords: LeaveEntry[],
  timesheets: TimesheetEntry[]
): Promise<ClosureResult> {
  const rollback = async () => {
    await supabase.from("timesheets").delete().eq("closure_id", closureId);
    await supabase.from("leave_records").delete().eq("closure_id", closureId);
  };

  if (leaveRecords.length > 0) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("leave_records")
      .insert(leaveRecords.map((r) => ({ ...convertLeaveEntryKeysToSnakeCase(r), updated_at: now })));
    if (error) {
      await rollback();
      return fail("insert leave failed", error);
    }
  }
  if (timesheets.length > 0) {
    const { error } = await supabase.from("timesheets").insert(timesheets.map(convertTimesheetKeysToSnakeCase));
    if (error) {
      await rollback();
      return fail("insert timesheets failed", error);
    }
  }
  const { error } = await supabase
    .from("company_closures")
    .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", closureId);
  if (error) {
    await rollback();
    return fail("publish failed", error);
  }
  return { ok: true, data: undefined };
}

export async function countAdvancePayslips(closureId: string): Promise<number> {
  const { count, error } = await supabase
    .from("payslips")
    .select("id", { count: "exact", head: true })
    .eq("paid_in_advance_closure_id", closureId);
  if (error) {
    logger.error("closure-queries: count advance payslips failed", toLogError(error));
    return -1;
  }
  return count ?? 0;
}

/** Removes the closure leave and timesheets. Refused once any week has been paid in advance. */
export async function unpublishClosure(closureId: string): Promise<ClosureResult> {
  const paid = await countAdvancePayslips(closureId);
  if (paid !== 0) {
    return {
      ok: false,
      error:
        paid < 0
          ? "Could not check for closure payslips. Try again."
          : `${paid} payslip(s) were already paid in advance for this closure. Remove those payslips first.`,
    };
  }
  const { count: locked, error: lockedError } = await supabase
    .from("timesheets")
    .select("id", { count: "exact", head: true })
    .eq("closure_id", closureId)
    .eq("status", "Locked");
  if (lockedError) return fail("check locked timesheets failed", lockedError);
  if ((locked ?? 0) > 0) {
    return { ok: false, error: `${locked} closure timesheet(s) are locked by a processed payroll run.` };
  }

  const { error: tsError } = await supabase.from("timesheets").delete().eq("closure_id", closureId);
  if (tsError) return fail("delete timesheets failed", tsError);
  const { error: leaveError } = await supabase.from("leave_records").delete().eq("closure_id", closureId);
  if (leaveError) return fail("delete leave failed", leaveError);
  const { error } = await supabase
    .from("company_closures")
    .update({ status: "draft", published_at: null, updated_at: new Date().toISOString() })
    .eq("id", closureId);
  if (error) return fail("unpublish failed", error);
  return { ok: true, data: undefined };
}

/** Phone push telling staff the closure is confirmed. No pay amounts are sent. */
export async function sendClosurePush(closureId: string): Promise<{ ok: boolean; sent?: number; error?: string; disabled?: boolean }> {
  const { data, error } = await supabase.functions.invoke("send-closure-push", { body: { closureId } });
  if (error) return { ok: false, error: await parseFunctionError(error, data, { service: "generic" }) };
  const result = data as { ok?: boolean; sent?: number; error?: string; reason?: string };
  if (result?.ok) return { ok: true, sent: result.sent };
  return { ok: false, error: result?.error ?? "Unknown error", disabled: result?.reason === "not_configured" };
}
