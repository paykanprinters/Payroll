import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isSmsPortalConfigured, normalizeSaMsisdn, sendSms } from "../_shared/smsportal.ts";
import { renderPayslipSms, renderReminderSms, renderTestSms } from "../_shared/sms-templates.ts";

interface NotificationSettings {
  from_name: string | null;
  portal_url: string | null;
  sms_enabled: boolean | null;
  sms_sender_id: string | null;
  send_payslip_sms: boolean | null;
  send_sms_reminders: boolean | null;
}

interface ReminderItem {
  phone?: string;
  name?: string;
  message: string;
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userResult, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userResult?.user) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userResult.user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "Admin" && profile.role !== "Manager")) {
    return jsonResponse({ ok: false, error: "Forbidden" }, 403, corsHeaders);
  }

  if (!isSmsPortalConfigured()) {
    return jsonResponse(
      { ok: false, error: "SMS is not configured. Set SMSPORTAL_CLIENT_ID and SMSPORTAL_API_SECRET on the server." },
      503,
      corsHeaders
    );
  }

  const { data: settingsRow } = await supabaseAdmin
    .from("notification_settings")
    .select("from_name, portal_url, sms_enabled, sms_sender_id, send_payslip_sms, send_sms_reminders")
    .limit(1)
    .maybeSingle();

  const settings = (settingsRow ?? {}) as NotificationSettings;
  if (settings.sms_enabled === false) {
    return jsonResponse({ ok: false, error: "SMS notifications are disabled in settings." }, 409, corsHeaders);
  }

  const companyName = settings.from_name?.trim() || "Payroll";
  const senderId = settings.sms_sender_id?.trim() || undefined;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const testMode = body.testMode === true;

  const logSend = async (
    category: string,
    recipient: string,
    content: string,
    result: { ok: boolean; id?: string; error?: string }
  ) => {
    await supabaseAdmin.from("notification_log").insert({
      channel: "sms",
      category,
      recipient,
      subject: content.slice(0, 160),
      status: result.ok ? "sent" : "failed",
      provider_id: result.id ?? null,
      error: result.ok ? null : result.error ?? "Unknown error",
      created_by: userResult.user.id,
    });
  };

  // --- Test mode (settings "send test SMS") ---
  if (body.test === true) {
    const to = normalizeSaMsisdn(body.to as string);
    if (!to) {
      return jsonResponse({ ok: false, error: "Enter a valid South African mobile number." }, 400, corsHeaders);
    }
    const content = renderTestSms(companyName);
    const result = await sendSms({ messages: [{ destination: to, content }], testMode, senderId });
    await logSend("test", to, content, result);
    return jsonResponse(result, result.ok ? 200 : 502, corsHeaders);
  }

  // --- Payslip-ready alert ---
  if (body.category === "payslip") {
    if (settings.send_payslip_sms === false) {
      return jsonResponse({ ok: false, error: "Payslip SMS alerts are disabled in settings." }, 409, corsHeaders);
    }
    const employee = (body.employee ?? {}) as { name?: string; phone?: string };
    const payslip = (body.payslip ?? {}) as { periodLabel?: string; netPay?: number };
    const to = normalizeSaMsisdn(employee.phone);
    if (!to) {
      return jsonResponse({ ok: false, error: "Employee has no valid mobile number.", reason: "no-phone" }, 400, corsHeaders);
    }
    if (!payslip.periodLabel) {
      return jsonResponse({ ok: false, error: "payslip.periodLabel is required." }, 400, corsHeaders);
    }
    const content = renderPayslipSms({
      companyName,
      employeeName: employee.name?.trim() || "there",
      periodLabel: payslip.periodLabel,
      netPay: typeof payslip.netPay === "number" ? payslip.netPay : undefined,
      portalUrl: settings.portal_url?.trim() || undefined,
    });
    const result = await sendSms({ messages: [{ destination: to, content }], testMode, senderId });
    await logSend("payslip", to, content, result);
    return jsonResponse(result, result.ok ? 200 : 502, corsHeaders);
  }

  // --- Payroll reminders ---
  if (body.category === "reminder") {
    if (settings.send_sms_reminders === false) {
      return jsonResponse({ ok: false, error: "SMS reminders are disabled in settings.", reason: "disabled" }, 409, corsHeaders);
    }
    const reminders = Array.isArray(body.reminders) ? (body.reminders as ReminderItem[]) : [];
    const messages: { destination: string; content: string }[] = [];
    const logRows: Record<string, unknown>[] = [];
    let skipped = 0;

    for (const item of reminders) {
      const to = normalizeSaMsisdn(item.phone);
      if (!to) {
        skipped++;
        continue;
      }
      const content = renderReminderSms({ companyName, recipientName: item.name, message: item.message });
      messages.push({ destination: to, content });
    }

    if (messages.length === 0) {
      return jsonResponse({ ok: false, error: "No recipients with valid mobile numbers.", skipped }, 400, corsHeaders);
    }

    const result = await sendSms({ messages, testMode, senderId });
    for (const m of messages) {
      logRows.push({
        channel: "sms",
        category: "reminder",
        recipient: m.destination,
        subject: m.content.slice(0, 160),
        status: result.ok ? "sent" : "failed",
        provider_id: result.id ?? null,
        error: result.ok ? null : result.error ?? "Unknown error",
        created_by: userResult.user.id,
      });
    }
    if (logRows.length > 0) await supabaseAdmin.from("notification_log").insert(logRows);

    return jsonResponse(
      { ok: result.ok, sent: result.ok ? messages.length : 0, skipped, error: result.ok ? undefined : result.error },
      result.ok ? 200 : 502,
      corsHeaders
    );
  }

  return jsonResponse({ ok: false, error: "Unknown SMS request." }, 400, corsHeaders);
});
