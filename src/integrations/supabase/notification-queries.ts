import { supabase } from "@/integrations/supabase/client";
import { logger, toLogError } from "@/lib/logger";
import { parseFunctionError } from "@/lib/parse-function-error";
import type { PayslipEmailPayload } from "@/lib/email/build-payslip-email-payload";
import type { PayslipSmsPayload } from "@/lib/sms/build-payslip-sms-payload";

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
  sendWelcomeEmail: boolean;
  sendWelcomeSms: boolean;
  portalUrl: string;
  smsEnabled: boolean;
  smsSenderId: string;
  sendPayslipSms: boolean;
  sendSmsReminders: boolean;
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
  sendWelcomeEmail: true,
  sendWelcomeSms: true,
  portalUrl: "",
  smsEnabled: false,
  smsSenderId: "",
  sendPayslipSms: false,
  sendSmsReminders: false,
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
    sendWelcomeEmail: row.send_welcome_email !== false,
    sendWelcomeSms: row.send_welcome_sms !== false,
    portalUrl: (row.portal_url as string) ?? "",
    smsEnabled: !!row.sms_enabled,
    smsSenderId: (row.sms_sender_id as string) ?? "",
    sendPayslipSms: !!row.send_payslip_sms,
    sendSmsReminders: !!row.send_sms_reminders,
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
    send_welcome_email: settings.sendWelcomeEmail,
    send_welcome_sms: settings.sendWelcomeSms,
    portal_url: settings.portalUrl.trim() || null,
    sms_enabled: settings.smsEnabled,
    sms_sender_id: settings.smsSenderId.trim() || null,
    send_payslip_sms: settings.sendPayslipSms,
    send_sms_reminders: settings.sendSmsReminders,
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
  channel: string;
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
    .select("id, channel, category, recipient, subject, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("notification-queries: log fetch failed", toLogError(error));
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    channel: (row.channel as string) ?? "email",
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
  if (error) return { ok: false, error: await parseFunctionError(error, data, { service: "email" }) };
  const result = data as SendResult;
  return result?.ok ? { ok: true } : { ok: false, error: result?.error ?? "Unknown error" };
}

export interface SmsReminderItem {
  phone?: string;
  name?: string;
  message: string;
}

export async function sendTestSms(to: string): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: { test: true, to },
  });
  if (error) return { ok: false, error: await parseFunctionError(error, data, { service: "sms" }) };
  const result = data as SendResult;
  return result?.ok ? { ok: true } : { ok: false, error: result?.error ?? "Unknown error" };
}

export async function sendPayslipSms(payload: PayslipSmsPayload): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: { category: "payslip", employee: payload.employee, payslip: payload.payslip },
  });
  if (error) return { ok: false, error: await parseFunctionError(error, data, { service: "sms" }) };
  const result = data as SendResult;
  return result?.ok ? { ok: true } : { ok: false, error: result?.error ?? "Unknown error" };
}

export interface SmsBatchResult {
  ok: boolean;
  sent?: number;
  skipped?: number;
  error?: string;
  disabled?: boolean;
}

export async function sendSmsReminders(
  reminders: SmsReminderItem[],
  runId?: string,
  runLabel?: string
): Promise<SmsBatchResult> {
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: { category: "reminder", reminders, runId, runLabel },
  });
  if (error) {
    const parsed = data as { reason?: string } | null;
    return {
      ok: false,
      error: await parseFunctionError(error, data, { service: "sms" }),
      disabled: parsed?.reason === "disabled",
    };
  }
  const result = data as SmsBatchResult & { reason?: string };
  if (result?.ok) return { ok: true, sent: result.sent, skipped: result.skipped };
  return { ok: false, error: result?.error ?? "Unknown error", disabled: result?.reason === "disabled" };
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
  if (error) return { ok: false, error: await parseFunctionError(error, data, { service: "email" }) };
  const result = data as SendResult;
  return result?.ok ? { ok: true } : { ok: false, error: result?.error ?? "Unknown error" };
}
