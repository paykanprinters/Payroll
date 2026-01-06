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
    const userId = typeof payload?.userId === "string" ? payload.userId : undefined;
    const email = typeof payload?.email === "string" ? payload.email : undefined;

    if (!userId && !email) {
      console.error("[confirm-user-email] Missing userId or email");
      return new Response(JSON.stringify({ error: "Provide userId or email." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
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

    // Admin gate
    const { data: requesterProfile, error: roleErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", requestingUser.id)
      .maybeSingle();

    if (roleErr || requesterProfile?.role !== "Admin") {
      console.error("[confirm-user-email] Forbidden, caller not Admin", { roleErr, role: requesterProfile?.role });
      return new Response(JSON.stringify({ error: "Forbidden: Only Admins can confirm emails." }), {
        status: 403, headers: corsHeaders
      });
    }

    // Resolve target user via Admin API
    let targetUserId = userId;

    if (!targetUserId && email) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr || !list) {
        console.error("[confirm-user-email] listUsers failed", { listErr });
        return new Response(JSON.stringify({ error: "Failed to list users." }), {
          status: 500, headers: corsHeaders
        });
      }
      const match = list.users.find((u: any) => u.email === email);
      if (!match) {
        console.error("[confirm-user-email] No user found by email", { email });
        return new Response(JSON.stringify({ error: "User not found by email." }), {
          status: 404, headers: corsHeaders
        });
      }
      targetUserId = match.id;
    }

    // Confirm email via Admin API (v2: email_confirm flag)
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId!, {
      email_confirm: true,
    });

    if (error) {
      console.error("[confirm-user-email] updateUserById failed", { error });
      return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("[confirm-user-email] Email confirmed flag set", { userId: data.user?.id });
    return new Response(JSON.stringify({
      message: "Email confirmed",
      user: data.user?.id,
      email_confirmed_at: data.user?.email_confirmed_at ?? null
    }), {
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