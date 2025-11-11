"use client";

import { supabase } from "@/integrations/supabase/client";

export async function saveGeneratedReport(reportTitle: string, contentHtml: string): Promise<boolean> {
  const { error } = await supabase
    .from("generated_reports")
    .insert({
      report_title: reportTitle,
      report_type: "bulk-payslips-report",
      content_html: contentHtml,
      generated_at: new Date().toISOString(),
    });

  return !error;
}

// Simple checksum (FNV-1a-like) for content integrity note embedded into HTML
export function computeChecksum(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return ("00000000" + hash.toString(16)).slice(-8);
}