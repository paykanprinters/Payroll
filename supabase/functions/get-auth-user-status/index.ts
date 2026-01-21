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
      console.error("[get-auth-user-status] Missing userId/email");
      return new Response(JSON.stringify({ error: "Provide userId or email." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[get-auth-user-status] Missing Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
    if (tokenErr || !requestingUser) {
      console.error("[get-auth-user-status] Invalid token", { tokenErr });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders
      });
    }

    // Admin gate
    const { data: requesterProfile, error: roleErr } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", requestingUser.id)
      .maybeSingle();

    if (roleErr || requesterProfile?.role !== "Admin") {
      console.error("[get-auth-user-status] Forbidden; caller not Admin", { roleErr, role: requesterProfile?.role });
      return new Response(JSON.stringify({ error: "Forbidden: Admins only." }), {
        status: 403, headers: corsHeaders
      });
    }

    // Resolve via Admin API
    if (userId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (error || !data?.user) {
        console.error("[get-auth-user-status] getUserById failed", { error, userId });
        return new Response(JSON.stringify({ error: "User not found by id." }), {
          status: 404, headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve by email through listUsers
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr || !list) {
      console.error("[get-auth-user-status] listUsers failed", { listErr });
      return new Response(JSON.stringify({ error: "Failed to list users." }), {
        status: 500, headers: corsHeaders
      });
    }
    const match = list.users.find((u: any) => u.email === email);
    if (!match) {
      console.error("[get-auth-user-status] No user found by email", { email });
      return new Response(JSON.stringify({ error: "User not found by email." }), {
        status: 404, headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      id: match.id,
      email: match.email,
      email_confirmed_at: match.email_confirmed_at
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[get-auth-user-status] Uncaught error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});