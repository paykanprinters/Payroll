import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return json({ error: "User ID is required." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !requestingUser) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", requestingUser.id)
      .maybeSingle();
    if (profileError || callerProfile?.role !== "Admin") {
      return json({ error: "Forbidden: Only Admins can reset two-factor login." }, 403);
    }

    const { data: factorData, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId,
    });
    if (listError) {
      console.error("[reset-user-mfa] listFactors failed", { error: listError });
      return json({ error: listError.message || "Could not list factors." }, 500);
    }

    const factors = factorData?.factors ?? [];
    for (const factor of factors) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId,
      });
      if (deleteError) {
        console.error("[reset-user-mfa] deleteFactor failed", { error: deleteError });
        return json({ error: deleteError.message || "Could not remove factor." }, 500);
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: requestingUser.id,
      action: "mfa_reset",
      entity_type: "user",
      entity_id: userId,
      severity: "auth",
      module: "auth",
      message: "Two-factor login reset by Admin",
      metadata: { removed_factors: factors.length },
    });

    return json({ message: "Two-factor login reset.", removed: factors.length }, 200);
  } catch (error: unknown) {
    console.error("[reset-user-mfa] Uncaught error", { error });
    return json({ error: "Internal server error" }, 500);
  }
});
