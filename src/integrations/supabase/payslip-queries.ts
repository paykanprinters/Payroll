import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function listMyPayslips() {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from("payslips")
    .select("id, pay_period, pay_date, net_pay, created_at")
    .eq("employee_id", uid)
    .order("pay_date", { ascending: false })
  if (error) throw error
  return data
}

export async function getMyPayslip(id: string) {
  // RLS ensures only owner or admin can read; do not trust client-provided employee_id
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

// New: full fetch (keep as-is for admin-only contexts if used)
export async function fetchPayslipsFromSupabase() {
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .order("pay_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// New: upsert single payslip
export async function upsertPayslipToSupabase(payslip: any) {
  const { data, error } = await supabase
    .from("payslips")
    .upsert(payslip, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// New: batch upsert
export async function batchUpsertPayslipsToSupabase(payslips: any[]) {
  if (!Array.isArray(payslips) || payslips.length === 0) return true;
  const { error } = await supabase
    .from("payslips")
    .upsert(payslips, { onConflict: "id" });
  if (error) throw error;
  return true;
}