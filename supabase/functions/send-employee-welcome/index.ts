import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { isResendConfigured, sendEmail } from "../_shared/resend.ts";
import { renderEmailShell } from "../_shared/email-templates.ts";
import { buildEmployeeWelcomeVariables, interpolateTemplate } from "../_shared/template-engine.ts";
import { isSmsPortalConfigured, normalizeSaMsisdn, sendSms } from "../_shared/smsportal.ts";

interface MessageTemplate {
  template_key: string;
  channel: string;
  subject: string | null;
  body: string;
  enabled: boolean;
  include_logo: boolean;
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Light-background mark (black artwork). Never use company_details.logourl here —
 * that asset is the dark-background mark and reads as black-on-black in email. */
const EMAIL_LOGO_PATH = "/brand/kanprinters_horizontal_mono_black.png";
const EMAIL_LOGO_FALLBACK_ORIGINS = [
  "https://payroll.kanprinters.co.za",
  "https://payroll-beta-orcin.vercel.app",
];

function originFromUrl(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function resolveEmailLogoUrl(portalUrl?: string | null): string {
  const origins = [
    originFromUrl(portalUrl),
    ...EMAIL_LOGO_FALLBACK_ORIGINS,
  ].filter((o): o is string => !!o);
  return `${origins[0]}${EMAIL_LOGO_PATH}`;
}

type DeliveryStatus = "sent" | "failed" | "skipped";

interface LogDeliveryInput {
  channel: "email" | "sms";
  recipient: string;
  subject?: string | null;
  status: DeliveryStatus;
  providerId?: string | null;
  error?: string | null;
  templateKey: string;
  employeeId: string;
  createdBy: string;
}

async function logDelivery(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: LogDeliveryInput,
) {
  await supabaseAdmin.from("notification_log").insert({
    channel: input.channel,
    category: "welcome",
    recipient: input.recipient,
    subject: input.subject ?? null,
    status: input.status,
    provider_id: input.providerId ?? null,
    error: input.error ?? null,
    metadata: { employeeId: input.employeeId, templateKey: input.templateKey },
    created_by: input.createdBy,
  });
}

function resultToLog(
  code: string,
): { status: DeliveryStatus; error: string | null } {
  if (code === "sent") return { status: "sent", error: null };
  if (code === "disabled") {
    return { status: "skipped", error: "Template is turned off in Message templates." };
  }
  if (code === "disabled_settings") {
    return { status: "skipped", error: "Welcome Package is turned off in Settings → Notifications." };
  }
  if (code === "skipped_no_email") {
    return { status: "skipped", error: "Employee has no valid email address on file." };
  }
  if (code === "skipped_no_phone") {
    return { status: "skipped", error: "Employee has no valid South African mobile number on file." };
  }
  if (code === "disabled_channel") {
    return { status: "skipped", error: "SMS notifications are disabled in Settings → Notifications." };
  }
  if (code === "failed_not_configured") {
    return { status: "failed", error: "Email/SMS provider is not configured on the server (missing API secrets)." };
  }
  if (code === "failed_no_sender") {
    return { status: "failed", error: "No sender email saved in Settings → Notifications." };
  }
  if (code.startsWith("failed:")) {
    return { status: "failed", error: code.slice("failed:".length) };
  }
  return { status: "failed", error: code };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

  let body: { employeeId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const employeeId = body.employeeId?.trim();
  if (!employeeId) {
    return jsonResponse({ ok: false, error: "employeeId is required." }, 400, corsHeaders);
  }

  const { data: employee, error: employeeErr } = await supabaseAdmin
    .from("employees")
    .select(
      "id, first_name, last_name, email, phone_number, job_title, start_date, id_number, tax_reference_number, bank_name, iban_number, routing_swift_code, address_line1, permanent_address, payment_mode",
    )
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeErr || !employee) {
    return jsonResponse({ ok: false, error: "Employee not found." }, 404, corsHeaders);
  }

  const [{ data: settingsRow }, { data: companyRow }, { data: templates }] = await Promise.all([
    supabaseAdmin
      .from("notification_settings")
      .select(
        "from_name, from_email, reply_to, portal_url, sms_enabled, sms_sender_id, send_welcome_email, send_welcome_sms",
      )
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("company_details")
      .select("companylegalname, companytradingname, logourl")
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("message_templates")
      .select("template_key, channel, subject, body, enabled, include_logo")
      .in("template_key", ["employee_welcome_email", "employee_welcome_sms"]),
  ]);

  const vars = buildEmployeeWelcomeVariables({
    employee,
    company: companyRow,
    settings: settingsRow,
  });
  const companyName = String(vars.companyName ?? "Kan Printers");
  const employeeLabel = `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() || employeeId;
  const results: { email?: string; sms?: string } = {};

  const emailTemplate = (templates ?? []).find((t: MessageTemplate) => t.template_key === "employee_welcome_email") as
    | MessageTemplate
    | undefined;
  const smsTemplate = (templates ?? []).find((t: MessageTemplate) => t.template_key === "employee_welcome_sms") as
    | MessageTemplate
    | undefined;

  const welcomeSubject = interpolateTemplate(
    emailTemplate?.subject || "Welcome to {{companyName}}",
    vars,
  );

  const welcomeEmailActivated = settingsRow?.send_welcome_email !== false;
  const welcomeSmsActivated = settingsRow?.send_welcome_sms !== false;

  if (emailTemplate?.enabled && welcomeEmailActivated) {
    const to = employee.email?.trim();
    if (!to || !EMAIL_RE.test(to)) {
      results.email = "skipped_no_email";
      const log = resultToLog(results.email);
      await logDelivery(supabaseAdmin, {
        channel: "email",
        recipient: employeeLabel,
        subject: welcomeSubject,
        status: log.status,
        error: log.error,
        templateKey: "employee_welcome_email",
        employeeId,
        createdBy: userResult.user.id,
      });
    } else if (!isResendConfigured()) {
      results.email = "failed_not_configured";
      const log = resultToLog(results.email);
      await logDelivery(supabaseAdmin, {
        channel: "email",
        recipient: to,
        subject: welcomeSubject,
        status: log.status,
        error: log.error,
        templateKey: "employee_welcome_email",
        employeeId,
        createdBy: userResult.user.id,
      });
    } else {
      const fromEmail = settingsRow?.from_email?.trim();
      if (!fromEmail || !EMAIL_RE.test(fromEmail)) {
        results.email = "failed_no_sender";
        const log = resultToLog(results.email);
        await logDelivery(supabaseAdmin, {
          channel: "email",
          recipient: to,
          subject: welcomeSubject,
          status: log.status,
          error: log.error,
          templateKey: "employee_welcome_email",
          employeeId,
          createdBy: userResult.user.id,
        });
      } else {
        const subject = welcomeSubject;
        const bodyHtml = interpolateTemplate(emailTemplate.body, vars);
        const html = renderEmailShell({
          companyName,
          heading: "Welcome to the team",
          bodyHtml,
          logoUrl: emailTemplate.include_logo
            ? resolveEmailLogoUrl(settingsRow?.portal_url)
            : undefined,
          footerNote: "This message was sent because your employee record was created in payroll.",
        });
        const sendResult = await sendEmail({
          from: `${settingsRow?.from_name?.trim() || companyName} <${fromEmail}>`,
          to: [to],
          subject,
          html,
          replyTo: settingsRow?.reply_to?.trim() || undefined,
        });
        results.email = sendResult.ok ? "sent" : `failed:${sendResult.error}`;
        const log = resultToLog(results.email);
        await logDelivery(supabaseAdmin, {
          channel: "email",
          recipient: to,
          subject,
          status: log.status,
          providerId: sendResult.id ?? null,
          error: log.error,
          templateKey: "employee_welcome_email",
          employeeId,
          createdBy: userResult.user.id,
        });
      }
    }
  } else {
    results.email = emailTemplate?.enabled ? "disabled_settings" : "disabled";
    const log = resultToLog(results.email);
    await logDelivery(supabaseAdmin, {
      channel: "email",
      recipient: employee.email?.trim() || employeeLabel,
      subject: welcomeSubject,
      status: log.status,
      error: log.error,
      templateKey: "employee_welcome_email",
      employeeId,
      createdBy: userResult.user.id,
    });
  }

  if (smsTemplate?.enabled && welcomeSmsActivated) {
    const msisdn = normalizeSaMsisdn(employee.phone_number ?? "");
    if (!msisdn) {
      results.sms = "skipped_no_phone";
      const log = resultToLog(results.sms);
      await logDelivery(supabaseAdmin, {
        channel: "sms",
        recipient: employee.phone_number?.trim() || employeeLabel,
        status: log.status,
        error: log.error,
        templateKey: "employee_welcome_sms",
        employeeId,
        createdBy: userResult.user.id,
      });
    } else if (!isSmsPortalConfigured()) {
      results.sms = "failed_not_configured";
      const log = resultToLog(results.sms);
      await logDelivery(supabaseAdmin, {
        channel: "sms",
        recipient: msisdn,
        status: log.status,
        error: log.error,
        templateKey: "employee_welcome_sms",
        employeeId,
        createdBy: userResult.user.id,
      });
    } else if (settingsRow?.sms_enabled === false) {
      results.sms = "disabled_channel";
      const log = resultToLog(results.sms);
      await logDelivery(supabaseAdmin, {
        channel: "sms",
        recipient: msisdn,
        status: log.status,
        error: log.error,
        templateKey: "employee_welcome_sms",
        employeeId,
        createdBy: userResult.user.id,
      });
    } else {
      const message = interpolateTemplate(smsTemplate.body, vars);
      const senderId = settingsRow?.sms_sender_id?.trim() || companyName.slice(0, 11);
      const sendResult = await sendSms({
        messages: [{ destination: msisdn, content: message }],
        senderId,
      });
      results.sms = sendResult.ok ? "sent" : `failed:${sendResult.error}`;
      const log = resultToLog(results.sms);
      await logDelivery(supabaseAdmin, {
        channel: "sms",
        recipient: msisdn,
        status: log.status,
        providerId: sendResult.id ?? null,
        error: log.error,
        templateKey: "employee_welcome_sms",
        employeeId,
        createdBy: userResult.user.id,
      });
    }
  } else {
    results.sms = smsTemplate?.enabled ? "disabled_settings" : "disabled";
    const log = resultToLog(results.sms);
    await logDelivery(supabaseAdmin, {
      channel: "sms",
      recipient: employee.phone_number?.trim() || employeeLabel,
      status: log.status,
      error: log.error,
      templateKey: "employee_welcome_sms",
      employeeId,
      createdBy: userResult.user.id,
    });
  }

  const anySent = results.email === "sent" || results.sms === "sent";
  const allSkipped =
    (results.email?.startsWith("skipped") ||
      results.email === "disabled" ||
      results.email === "disabled_settings") &&
    (results.sms?.startsWith("skipped") ||
      results.sms === "disabled" ||
      results.sms === "disabled_settings");

  return jsonResponse(
    {
      ok: anySent || allSkipped,
      results,
      message: anySent
        ? "Welcome notification sent."
        : allSkipped
          ? "Welcome templates are disabled or employee contact details are missing."
          : "Welcome notification could not be sent. Check notification settings and templates.",
    },
    200,
    corsHeaders,
  );
});
