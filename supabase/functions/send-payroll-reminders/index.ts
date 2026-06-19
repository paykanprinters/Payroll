import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 401,
    });
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResult, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userResult?.user) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 401,
    });
  }

  // Only Admins may trigger payroll reminders.
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userResult.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "Admin") {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 403,
    });
  }

  try {
    const body = await req.json();
    console.log("[send-payroll-reminders] received", { count: (body?.reminders || []).length });

    // Here you would integrate with email/Slack providers.
    // For now, we accept the payload and respond OK.

    return new Response(JSON.stringify({ ok: true, count: (body?.reminders || []).length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    console.error("[send-payroll-reminders] error", e);
    return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
});
