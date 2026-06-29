import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isResendConfigured, sendEmail } from "../_shared/resend.ts";
import { renderPayslipEmail, renderTestEmail } from "../_shared/email-templates.ts";

interface NotificationSettings {
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  admin_email: string | null;
  cc_admins: boolean | null;
  send_payslip_emails: boolean | null;
  portal_url: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (!isResendConfigured()) {
    return jsonResponse(
      { ok: false, error: "Email is not configured. Set the RESEND_API_KEY secret on the server." },
      503,
      corsHeaders
    );
  }

  const { data: settingsRow } = await supabaseAdmin
    .from("notification_settings")
    .select("from_name, from_email, reply_to, admin_email, cc_admins, send_payslip_emails, portal_url")
    .limit(1)
    .maybeSingle();

  const settings = (settingsRow ?? {}) as NotificationSettings;
  const fromEmail = settings.from_email?.trim();
  if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
    return jsonResponse(
      { ok: false, error: "No valid sender address configured. Set it under Settings → Notifications." },
      400,
      corsHeaders
    );
  }
  const fromName = settings.from_name?.trim() || "Payroll";
  const from = `${fromName} <${fromEmail}>`;
  const replyTo = settings.reply_to?.trim() || undefined;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const companyName = (body.companyName as string)?.trim() || fromName;

  // Test-email mode (used by the settings "send test" button).
  if (body.test === true) {
    const to = (body.to as string)?.trim();
    if (!to || !EMAIL_RE.test(to)) {
      return jsonResponse({ ok: false, error: "A valid test recipient address is required." }, 400, corsHeaders);
    }
    const { subject, html } = renderTestEmail(companyName);
    const result = await sendEmail({ from, to, subject, html, replyTo });
    await supabaseAdmin.from("notification_log").insert({
      channel: "email",
      category: "test",
      recipient: to,
      subject,
      status: result.ok ? "sent" : "failed",
      provider_id: result.id ?? null,
      error: result.ok ? null : result.error ?? "Unknown error",
      created_by: userResult.user.id,
    });
    return jsonResponse(result, result.ok ? 200 : 502, corsHeaders);
  }

  // Payslip-email mode.
  if (settings.send_payslip_emails === false) {
    return jsonResponse({ ok: false, error: "Payslip emails are disabled in notification settings." }, 409, corsHeaders);
  }

  const employee = (body.employee ?? {}) as { name?: string; email?: string };
  const payslip = (body.payslip ?? {}) as {
    periodLabel?: string;
    netPay?: number;
    grossEarnings?: number;
    totalDeductions?: number;
  };
  const to = employee.email?.trim();
  if (!to || !EMAIL_RE.test(to)) {
    return jsonResponse({ ok: false, error: "Employee has no valid email address." }, 400, corsHeaders);
  }
  if (!payslip.periodLabel) {
    return jsonResponse({ ok: false, error: "payslip.periodLabel is required." }, 400, corsHeaders);
  }

  const pdfBase64 = (body.pdfBase64 as string)?.trim();
  const attachments = pdfBase64
    ? [{ filename: (body.pdfFilename as string)?.trim() || "payslip.pdf", content: pdfBase64 }]
    : undefined;

  const { subject, html } = renderPayslipEmail({
    companyName,
    employeeName: employee.name?.trim() || "there",
    periodLabel: payslip.periodLabel,
    netPay: Number(payslip.netPay ?? 0),
    grossEarnings: typeof payslip.grossEarnings === "number" ? payslip.grossEarnings : undefined,
    totalDeductions: typeof payslip.totalDeductions === "number" ? payslip.totalDeductions : undefined,
    hasAttachment: !!attachments,
    portalUrl: settings.portal_url?.trim() || undefined,
  });

  const cc = settings.cc_admins && settings.admin_email?.trim() ? settings.admin_email.trim() : undefined;
  const result = await sendEmail({ from, to, subject, html, replyTo, cc, attachments });

  await supabaseAdmin.from("notification_log").insert({
    channel: "email",
    category: "payslip",
    recipient: to,
    subject,
    status: result.ok ? "sent" : "failed",
    provider_id: result.id ?? null,
    error: result.ok ? null : result.error ?? "Unknown error",
    metadata: { periodLabel: payslip.periodLabel },
    created_by: userResult.user.id,
  });

  return jsonResponse(result, result.ok ? 200 : 502, corsHeaders);
});
