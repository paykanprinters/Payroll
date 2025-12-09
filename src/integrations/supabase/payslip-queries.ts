import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function listMyPayslips() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("payslips")
    .select("id, pay_period, pay_date, net_pay, created_at")
    .eq("employee_id", uid)
    .order("pay_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMyPayslip(id: string) {
  // RLS ensures only owner or admin can read; do not trust client-provided employee_id
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Admin-aware fetch: admins see all; non-admins see their own if permitted by RLS.
export async function fetchPayslipsFromSupabase() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? null;

  // Detect admin via secure RPC
  let isAdmin = false;
  try {
    const { data: adminFlag } = await supabase.rpc("is_admin");
    isAdmin = Boolean(adminFlag);
  } catch {
    isAdmin = false;
  }

  if (isAdmin) {
    const { data, error } = await supabase
      .from("payslips")
      .select("*")
      .order("pay_date", { ascending: false });
    if (error) {
      console.warn("fetchPayslipsFromSupabase (admin) error:", error);
      return [];
    }
    return data ?? [];
  }

  // Non-admin: show only the current user's payslips
  if (!uid) return [];
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("employee_id", uid)
    .order("pay_date", { ascending: false });
  if (error) {
    console.warn("fetchPayslipsFromSupabase (user) error:", error);
    return [];
  }
  return data ?? [];
}

// Upsert single payslip
export async function upsertPayslipToSupabase(payslip: any) {
  const { data, error } = await supabase
    .from("payslips")
    .upsert(payslip, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Batch upsert
export async function batchUpsertPayslipsToSupabase(payslips: any[]) {
  if (!Array.isArray(payslips) || payslips.length === 0) return true;
  const { error } = await supabase
    .from("payslips")
    .upsert(payslips, { onConflict: "id" });
  if (error) throw error;
  return true;
}