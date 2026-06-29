import { supabase } from "@/integrations/supabase/client";
import { logger, toLogError } from "@/lib/logger";
import type { PayslipEmailPayload } from "@/lib/email/build-payslip-email-payload";

export const NOTIFICATION_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export interface NotificationSettings {
  id: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  adminEmail: string;
  ccAdmins: boolean;
  sendPayslipEmails: boolean;
  sendReminders: boolean;
  portalUrl: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  id: NOTIFICATION_SETTINGS_ID,
  fromName: "Payroll",
  fromEmail: "",
  replyTo: "",
  adminEmail: "",
  ccAdmins: false,
  sendPayslipEmails: true,
  sendReminders: true,
  portalUrl: "",
};

function rowToSettings(row: Record<string, unknown>): NotificationSettings {
  return {
    id: (row.id as string) ?? NOTIFICATION_SETTINGS_ID,
    fromName: (row.from_name as string) ?? "",
    fromEmail: (row.from_email as string) ?? "",
    replyTo: (row.reply_to as string) ?? "",
    adminEmail: (row.admin_email as string) ?? "",
    ccAdmins: !!row.cc_admins,
    sendPayslipEmails: row.send_payslip_emails !== false,
    sendReminders: row.send_reminders !== false,
    portalUrl: (row.portal_url as string) ?? "",
  };
}

export async function fetchNotificationSettings(): Promise<NotificationSettings | null> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    logger.error("notification-queries: fetch failed", toLogError(error));
    return null;
  }
  return data ? rowToSettings(data) : null;
}

export async function upsertNotificationSettings(
  settings: NotificationSettings,
  updatedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    id: settings.id || NOTIFICATION_SETTINGS_ID,
    from_name: settings.fromName.trim() || null,
    from_email: settings.fromEmail.trim() || null,
    reply_to: settings.replyTo.trim() || null,
    admin_email: settings.adminEmail.trim() || null,
    cc_admins: settings.ccAdmins,
    send_payslip_emails: settings.sendPayslipEmails,
    send_reminders: settings.sendReminders,
    portal_url: settings.portalUrl.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };

  const { error } = await supabase
    .from("notification_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    logger.error("notification-queries: upsert failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export interface NotificationLogEntry {
  id: string;
  category: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

export async function fetchNotificationLog(limit = 50): Promise<NotificationLogEntry[]> {
  const { data, error } = await supabase
    .from("notification_log")
    .select("id, category, recipient, subject, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("notification-queries: log fetch failed", toLogError(error));
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    category: row.category as string,
    recipient: row.recipient as string,
    subject: (row.subject as string) ?? null,
    status: row.status as string,
    error: (row.error as string) ?? null,
    createdAt: row.created_at as string,
  }));
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendTestEmail(to: string, companyName: string): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-payslip-email", {
    body: { test: true, to, companyName },
  });
  if (error) return { ok: false, error: error.message };
  const result = data as SendResult;
  return result?.ok ? { ok: true } : { ok: false, error: result?.error ?? "Unknown error" };
}

export async function sendPayslipEmail(
  payload: PayslipEmailPayload,
  pdfBase64?: string
): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-payslip-email", {
    body: {
      companyName: payload.companyName,
      employee: payload.employee,
      payslip: payload.payslip,
      pdfBase64,
      pdfFilename: payload.pdfFilename,
    },
  });
  if (error) return { ok: false, error: error.message };
  const result = data as SendResult;
  return result?.ok ? { ok: true } : { ok: false, error: result?.error ?? "Unknown error" };
}
