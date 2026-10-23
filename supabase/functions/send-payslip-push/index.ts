import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { readServiceAccount, sendPush } from "../_shared/fcm.ts";

const MAX_PAYSLIPS = 500;
/** Re-saving an old payslip should not alert staff about a period they already have. */
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

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
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
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

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from("users")
    .select("role, status")
    .eq("id", userResult.user.id)
    .maybeSingle();
  if (!profile || profile.status !== "Active" || (profile.role !== "Admin" && profile.role !== "Manager")) {
    return jsonResponse({ ok: false, error: "Forbidden" }, 403, corsHeaders);
  }

  const account = readServiceAccount();
  if (!account) {
    return jsonResponse(
      { ok: false, reason: "not_configured", error: "Push is not configured. Set the FIREBASE_SERVICE_ACCOUNT secret." },
      200,
      corsHeaders
    );
  }

  let body: { payslipIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, corsHeaders);
  }
  const payslipIds = Array.isArray(body.payslipIds)
    ? [...new Set(body.payslipIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : [];
  if (payslipIds.length === 0) {
    return jsonResponse({ ok: true, sent: 0, skipped: 0 }, 200, corsHeaders);
  }
  if (payslipIds.length > MAX_PAYSLIPS) {
    return jsonResponse({ ok: false, error: `At most ${MAX_PAYSLIPS} payslips per request.` }, 400, corsHeaders);
  }

  const { data: payslips, error: payslipsErr } = await admin
    .from("payslips")
    .select("id, employee_id, pay_period, created_at")
    .in("id", payslipIds);
  if (payslipsErr) {
    return jsonResponse({ ok: false, error: "Could not load payslips." }, 500, corsHeaders);
  }

  const cutoff = Date.now() - RECENT_WINDOW_MS;
  let sent = 0;
  let skipped = 0;

  for (const payslip of payslips ?? []) {
    if (!payslip.employee_id || !payslip.pay_period) {
      skipped++;
      continue;
    }
    if (payslip.created_at && new Date(payslip.created_at).getTime() < cutoff) {
      skipped++;
      continue;
    }

    const { data: claimed } = await admin
      .from("payslip_push_notifications")
      .upsert(
        { employee_id: payslip.employee_id, pay_period: payslip.pay_period, payslip_id: payslip.id },
        { onConflict: "employee_id,pay_period", ignoreDuplicates: true }
      )
      .select("employee_id");
    if (!claimed || claimed.length === 0) {
      skipped++;
      continue;
    }

    const { data: tokens } = await admin
      .from("device_push_tokens")
      .select("token")
      .eq("employee_id", payslip.employee_id);
    if (!tokens || tokens.length === 0) {
      skipped++;
      continue;
    }

    const title = "New payslip available";
    const messageBody = `Your payslip for ${payslip.pay_period} is ready to view.`;
    const errors: string[] = [];
    let delivered = 0;

    for (const { token } of tokens) {
      try {
        const result = await sendPush(account, {
          token,
          title,
          body: messageBody,
          data: { url: `/staff/payslips?id=${payslip.id}` },
          androidChannelId: "payslips",
        });
        if (result.ok) {
          delivered++;
        } else {
          errors.push(result.error ?? "Unknown error");
          if (result.invalidToken) {
            await admin.from("device_push_tokens").delete().eq("token", token);
          }
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (delivered > 0) sent++;
    else skipped++;

    await admin.from("notification_log").insert({
      channel: "push",
      category: "payslip",
      recipient: payslip.employee_id,
      subject: title,
      status: delivered > 0 ? "sent" : "failed",
      error: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      metadata: { periodLabel: payslip.pay_period, payslipId: payslip.id, devices: tokens.length, delivered },
      created_by: userResult.user.id,
    });
  }

  return jsonResponse({ ok: true, sent, skipped }, 200, corsHeaders);
});
