import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FALLBACK_ALLOWED_ORIGINS = [
  "https://payroll.kanprinters.co.za",
  "https://payroll-beta-orcin.vercel.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const fromEnv = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = fromEnv.length > 0 ? fromEnv : FALLBACK_ALLOWED_ORIGINS;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

type CountersignDecisionInput = {
  runStatus: string | null | undefined;
  reviewedBy: string | null | undefined;
  approverId: string | null | undefined;
  approverRole: string | null | undefined;
  approverStatus: string | null | undefined;
};

function countersignBlockReason(input: CountersignDecisionInput): string | null {
  if (input.runStatus !== "Reviewed") {
    return "This payroll run is not waiting for approval.";
  }
  if (!input.reviewedBy) {
    return "This payroll run has not been reviewed yet.";
  }
  if (!input.approverId || (input.approverRole !== "Admin" && input.approverRole !== "Manager") || input.approverStatus !== "Active") {
    return "This account cannot approve payroll runs.";
  }
  if (input.approverId === input.reviewedBy) {
    return "Approval must be done by a different person than the reviewer.";
  }
  return null;
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

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerResult, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerResult?.user) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerProfile } = await admin
    .from("users")
    .select("role, status")
    .eq("id", callerResult.user.id)
    .maybeSingle();

  if (!callerProfile || callerProfile.status !== "Active" || (callerProfile.role !== "Admin" && callerProfile.role !== "Manager")) {
    return jsonResponse({ ok: false, error: "You cannot request a payroll approval." }, 403, corsHeaders);
  }

  let body: { runId?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid payload" }, 400, corsHeaders);
  }

  const runId = typeof body.runId === "string" ? body.runId.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!runId || !email || !password || password.length > 200) {
    return jsonResponse({ ok: false, error: "Enter the approver's email and password." }, 400, corsHeaders);
  }

  const { data: run, error: runError } = await admin
    .from("payroll_runs")
    .select("id, status, reviewed_by")
    .eq("id", runId)
    .maybeSingle();

  if (runError || !run) {
    return jsonResponse({ ok: false, error: "Payroll run not found." }, 404, corsHeaders);
  }

  const approverAuth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData, error: signInError } = await approverAuth.auth.signInWithPassword({
    email,
    password,
  });
  if (signInData?.session) {
    try {
      await approverAuth.auth.signOut();
    } catch {
      // Ending the short-lived sign-in is separate from the approval decision.
    }
  }
  if (signInError || !signInData?.user) {
    return jsonResponse({ ok: false, error: "Email or password is incorrect." }, 401, corsHeaders);
  }

  const { data: approver } = await admin
    .from("users")
    .select("id, name, role, status")
    .eq("id", signInData.user.id)
    .maybeSingle();

  const blocked = countersignBlockReason({
    runStatus: run.status,
    reviewedBy: run.reviewed_by,
    approverId: approver?.id,
    approverRole: approver?.role,
    approverStatus: approver?.status,
  });
  if (blocked || !approver) {
    return jsonResponse(
      { ok: false, error: blocked ?? "This account cannot approve payroll runs." },
      blocked?.includes("different person") ? 403 : 400,
      corsHeaders
    );
  }

  const approvedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("payroll_runs")
    .update({
      status: "Approved",
      approved_by: approver.id,
      approved_at: approvedAt,
    })
    .eq("id", runId)
    .eq("status", "Reviewed")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return jsonResponse({ ok: false, error: "This payroll run could not be approved." }, 409, corsHeaders);
  }

  return jsonResponse(
    { ok: true, approverId: approver.id, approverName: approver.name, approvedAt },
    200,
    corsHeaders
  );
});
