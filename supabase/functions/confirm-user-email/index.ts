import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const userId = payload?.userId as string | undefined;
    const email = payload?.email as string | undefined;

    if (!userId && !email) {
      console.error("[confirm-user-email] Missing userId or email");
      return new Response(JSON.stringify({ error: "Provide userId or email." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[confirm-user-email] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
    if (tokenErr || !requestingUser) {
      console.error("[confirm-user-email] Invalid token or user missing", { tokenErr });
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { data: requesterProfile, error: profileErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", requestingUser.id)
      .maybeSingle();

    if (profileErr || requesterProfile?.role !== "Admin") {
      console.error("[confirm-user-email] Forbidden, caller not Admin", { profileErr, role: requesterProfile?.role });
      return new Response(JSON.stringify({ error: "Forbidden: Only Admins can confirm emails." }), {
        status: 403, headers: corsHeaders
      });
    }

    // Resolve target user id if only email provided
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: targetAuthUser, error: findErr } = await supabaseAdmin
        .from("auth.users")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();
      if (findErr || !targetAuthUser) {
        console.error("[confirm-user-email] Could not resolve user by email", { findErr, email });
        return new Response(JSON.stringify({ error: "User not found by email." }), {
          status: 404, headers: corsHeaders
        });
      }
      targetUserId = targetAuthUser.id;
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId!, {
      email_confirmed_at: nowIso,
    });

    if (error) {
      console.error("[confirm-user-email] updateUserById failed", { error });
      return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("[confirm-user-email] Email confirmed", { userId: data.user?.id, at: nowIso });
    return new Response(JSON.stringify({ message: "Email confirmed", user: data.user?.id, email_confirmed_at: nowIso }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("[confirm-user-email] Uncaught error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});