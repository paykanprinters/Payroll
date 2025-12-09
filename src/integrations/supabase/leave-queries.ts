import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function listMyLeaveRecords() {
  const { data, error } = await supabase
    .from("leave_records")
    .select("id, leave_type, start_date, end_date, total_days, working_days, status:reason, created_at")
    .order("start_date", { ascending: false })
  if (error) throw error
  return data
}