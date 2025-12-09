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
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from("generated_reports")
    .select("id, report_title, report_type, generated_at")
    .eq("user_id", uid)
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

// New: simple checksum for report content de-duplication or caching
export function computeChecksum(input: string): string {
  let hash = 0;
  if (!input) return "0";
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // convert to 32-bit int
  }
  return Math.abs(hash).toString(16);
}

export async function saveGeneratedReport(title: string, html: string): Promise<boolean>;
export async function saveGeneratedReport(input: Omit<GeneratedReport, "id" | "generated_at">): Promise<GeneratedReport>;
export async function saveGeneratedReport(arg1: any, arg2?: any): Promise<any> {
  if (typeof arg1 === "string" && typeof arg2 === "string") {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? "00000000-0000-0000-0000-000000000000";
    await insertGeneratedReport({
      user_id: userId,
      report_title: arg1,
      report_type: "report",
      content_html: sanitizeHTML(arg2),
    } as any);
    return true;
  }
  return insertGeneratedReport(arg1 as Omit<GeneratedReport, "id" | "generated_at">);
}