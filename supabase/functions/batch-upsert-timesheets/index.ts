import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const getCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Manual authentication (verify_jwt is false)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userResult?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = userResult.user.id;

    // Check Admin role from public.users
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || profile?.role !== "Admin") {
      return new Response("Forbidden: Only Admins can import timesheets.", {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Parse payload: accept either { timesheets: [...] } or raw array
    const body = await req.json();
    const items = Array.isArray(body) ? body : Array.isArray(body?.timesheets) ? body.timesheets : [];

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ message: "No timesheets provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Perform upsert using service role
    const { error, count } = await supabaseAdmin
      .from("timesheets")
      .upsert(items, { onConflict: "id" })
      .select("id", { count: "exact" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Timesheets imported successfully.", insertedOrUpdated: count ?? 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("batch-upsert-timesheets: Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});