"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchLoansFromSupabase } from "@/integrations/supabase/loan-queries";
import { fetchSavingPlansFromSupabase } from "@/integrations/supabase/saving-queries";
import { fetchPayrollRuns } from "@/integrations/supabase/payroll-run-queries";
import {
  DEFAULT_JOURNAL_ACCOUNTS,
  mergeJournalAccounts,
  type AccessListUser,
  type AccountantExtraData,
} from "@/lib/accountant-report-data";

const EMPTY: AccountantExtraData = {
  loans: [],
  savingPlans: [],
  payrollRuns: [],
  users: [],
  journalAccounts: DEFAULT_JOURNAL_ACCOUNTS,
};

async function fetchAccessList(): Promise<AccessListUser[]> {
  const [{ data: users }, { data: signIns }] = await Promise.all([
    supabase.from("users").select("id, name, email, role, status, access_expires_at, created_at"),
    supabase
      .from("audit_logs")
      .select("user_id, created_at")
      .eq("action", "signed_in")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const lastSignIn = new Map<string, string>();
  for (const row of signIns || []) {
    if (row.user_id && !lastSignIn.has(row.user_id)) lastSignIn.set(row.user_id, row.created_at as string);
  }
  return (users || []).map((u) => ({
    id: u.id as string,
    name: (u.name as string) || (u.email as string) || "",
    email: (u.email as string) || "",
    role: (u.role as string) || "",
    status: (u.status as string | null) ?? null,
    accessExpiresAt: (u.access_expires_at as string | null) ?? null,
    createdAt: (u.created_at as string | null) ?? null,
    lastSignInAt: lastSignIn.get(u.id as string) ?? null,
  }));
}

async function fetchJournalAccounts() {
  const { data } = await supabase.from("company_details").select("journal_account_codes").limit(1);
  return mergeJournalAccounts(data?.[0]?.journal_account_codes);
}

/** Extra inputs for the ledger, register and evidence reports. */
export function useAccountantExtraData(enabled: boolean): AccountantExtraData {
  const [data, setData] = useState<AccountantExtraData>(EMPTY);

  useEffect(() => {
    if (!enabled) {
      setData(EMPTY);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [loans, savingPlans, payrollRuns, users, journalAccounts] = await Promise.all([
        fetchLoansFromSupabase(),
        fetchSavingPlansFromSupabase(),
        fetchPayrollRuns(),
        fetchAccessList(),
        fetchJournalAccounts(),
      ]);
      if (!cancelled) setData({ loans, savingPlans, payrollRuns, users, journalAccounts });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return data;
}
