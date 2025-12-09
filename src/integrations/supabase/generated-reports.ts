import { createClient } from "@supabase/supabase-js"
import { sanitizeHTML } from "@/utils/sanitize-html"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type GeneratedReport = {
  id: string
  user_id: string
  report_title: string
  report_type: string
  content_html: string
  generated_at: string
}

export async function insertGeneratedReport(input: Omit<GeneratedReport, "id" | "generated_at">) {
  const safeHtml = sanitizeHTML(input.content_html)
  const payload = { ...input, content_html: safeHtml }
  const { data, error } = await supabase.from("generated_reports").insert(payload).select("*").maybeSingle()
  if (error) throw error
  return data as GeneratedReport
}

export async function updateGeneratedReport(id: string, patch: Partial<Pick<GeneratedReport, "report_title" | "report_type" | "content_html">>) {
  const updatePayload = {
    ...patch,
    ...(patch.content_html ? { content_html: sanitizeHTML(patch.content_html) } : {})
  }
  const { data, error } = await supabase.from("generated_reports").update(updatePayload).eq("id", id).select("*").maybeSingle()
  if (error) throw error
  return data as GeneratedReport
}

export async function listMyReports() {
  const { data, error } = await supabase
    .from("generated_reports")
    .select("id, report_title, report_type, generated_at")
    .order("generated_at", { ascending: false })
  if (error) throw error
  return data as Pick<GeneratedReport, "id" | "report_title" | "report_type" | "generated_at">[]
}

export async function getMyReport(id: string) {
  const { data, error } = await supabase
    .from("generated_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as GeneratedReport
}