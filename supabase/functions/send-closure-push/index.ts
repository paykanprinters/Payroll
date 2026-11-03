import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { readServiceAccount, sendPush } from "../_shared/fcm.ts";

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" });

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

  let body: { closureId?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, corsHeaders);
  }
  const closureId = typeof body.closureId === "string" ? body.closureId : "";
  if (!closureId) {
    return jsonResponse({ ok: false, error: "closureId is required" }, 400, corsHeaders);
  }

  const { data: closure } = await admin
    .from("company_closures")
    .select("id, name, start_date, end_date, status")
    .eq("id", closureId)
    .maybeSingle();
  if (!closure || closure.status !== "published") {
    return jsonResponse({ ok: false, error: "Closure not found or not published." }, 404, corsHeaders);
  }

  const { data: leave, error: leaveErr } = await admin
    .from("leave_records")
    .select("employee_id, working_days")
    .eq("closure_id", closureId);
  if (leaveErr) {
    return jsonResponse({ ok: false, error: "Could not load closure leave." }, 500, corsHeaders);
  }
  const daysByEmployee = new Map<string, number>();
  for (const row of leave ?? []) {
    daysByEmployee.set(row.employee_id, (daysByEmployee.get(row.employee_id) ?? 0) + (row.working_days ?? 0));
  }

  const title = "Company closure confirmed";
  let sent = 0;
  let skipped = 0;

  for (const [employeeId, days] of daysByEmployee) {
    const { data: tokens } = await admin.from("device_push_tokens").select("token").eq("employee_id", employeeId);
    if (!tokens || tokens.length === 0) {
      skipped++;
      continue;
    }

    const { data: claimed } = await admin
      .from("closure_push_notifications")
      .upsert({ closure_id: closureId, employee_id: employeeId }, { onConflict: "closure_id,employee_id", ignoreDuplicates: true })
      .select("employee_id");
    if (!claimed || claimed.length === 0) {
      skipped++;
      continue;
    }

    const messageBody = `Closed ${formatDay(closure.start_date)} – ${formatDay(closure.end_date)}. ${days} leave day${days === 1 ? "" : "s"} booked. Tap to see your balance.`;
    const errors: string[] = [];
    let delivered = 0;
    for (const { token } of tokens) {
      try {
        const result = await sendPush(account, {
          token,
          title,
          body: messageBody,
          data: { url: "/staff/leave" },
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
      category: "closure",
      recipient: employeeId,
      subject: title,
      status: delivered > 0 ? "sent" : "failed",
      error: errors.length > 0 ? errors.join("; ").slice(0, 1000) : null,
      metadata: { closureId, closureName: closure.name, devices: tokens.length, delivered },
      created_by: userResult.user.id,
    });
  }

  return jsonResponse({ ok: true, sent, skipped }, 200, corsHeaders);
});
