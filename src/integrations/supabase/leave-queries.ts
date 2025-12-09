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

// New: fetch full leave records (admin or own, per RLS)
export async function fetchLeaveRecordsFromSupabase() {
  const { data, error } = await supabase
    .from("leave_records")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) throw error;
  return data;
}

// New: upsert leave record
export async function upsertLeaveRecordToSupabase(record: any) {
  const { data, error } = await supabase
    .from("leave_records")
    .upsert(record, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}