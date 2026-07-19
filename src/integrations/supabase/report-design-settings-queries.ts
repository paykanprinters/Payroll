"use client";

import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_REPORT_DESIGN_SETTINGS,
  mergeReportDesignSettings,
  type ReportDesignSettings,
} from "@/lib/report-design-interfaces";
import { showError } from "@/utils/toast";

type DbRow = {
  id: string;
  user_id: string | null;
  default_report_paper_size: string | null;
  include_company_logo: boolean | null;
  include_company_details: boolean | null;
  report_content_font_size: number | null;
  irp5_content_font_size: number | null;
  created_at?: string;
  updated_at?: string;
};

function toDomain(row?: DbRow | null): ReportDesignSettings {
  if (!row) return DEFAULT_REPORT_DESIGN_SETTINGS;
  const paper = row.default_report_paper_size;
  return mergeReportDesignSettings({
    defaultReportPaperSize:
      paper === "Letter" || paper === "A4" || paper === "A5"
        ? paper
        : DEFAULT_REPORT_DESIGN_SETTINGS.defaultReportPaperSize,
    includeCompanyLogo: row.include_company_logo ?? undefined,
    includeCompanyDetails: row.include_company_details ?? undefined,
    reportContentFontSize:
      row.report_content_font_size != null ? Number(row.report_content_font_size) : undefined,
    irp5ContentFontSize:
      row.irp5_content_font_size != null ? Number(row.irp5_content_font_size) : undefined,
  });
}

function fromDomain(settings: ReportDesignSettings, userId: string) {
  return {
    user_id: userId,
    default_report_paper_size: settings.defaultReportPaperSize,
    include_company_logo: settings.includeCompanyLogo,
    include_company_details: settings.includeCompanyDetails,
    report_content_font_size: settings.reportContentFontSize,
    irp5_content_font_size: settings.irp5ContentFontSize,
    updated_at: new Date().toISOString(),
  };
}

/** Returns saved row settings, or null when none exist / load failed (caller keeps local cache). */
export async function fetchReportDesignSettings(): Promise<ReportDesignSettings | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("report_design_settings")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    showError("Failed to load report design settings.");
    return null;
  }

  const row = data && data[0];
  if (!row) return null;
  return toDomain(row as DbRow);
}

export async function upsertReportDesignSettings(settings: ReportDesignSettings): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    showError("You must be signed in to save report design settings.");
    return false;
  }

  const userId = userData.user.id;
  const payload = fromDomain(settings, userId);

  const { data: updated, error: updateError } = await supabase
    .from("report_design_settings")
    .update(payload)
    .eq("user_id", userId)
    .select("id")
    .limit(1);

  if (updateError) {
    showError("Failed to update report design settings.");
    return false;
  }

  if (updated && updated.length > 0) {
    return true;
  }

  const { error: insertError } = await supabase.from("report_design_settings").insert(payload);
  if (insertError) {
    showError("Failed to save report design settings.");
    return false;
  }
  return true;
}
