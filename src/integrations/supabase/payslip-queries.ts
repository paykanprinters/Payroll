import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function listMyPayslips() {
  const { data, error } = await supabase
    .from("payslips")
    .select("id, pay_period, pay_date, net_pay, created_at")
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