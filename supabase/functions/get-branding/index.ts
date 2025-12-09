import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const origin = req.headers.get("Origin");
  if (!allowedOrigin || origin !== allowedOrigin) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("get-branding: Missing Supabase environment variables.");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Validate JWT and get requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester }, error: getUserErr } = await admin.auth.getUser(token);
    if (getUserErr || !requester) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enforce Admin role
    const { data: requesterProfile, error: roleErr } = await admin
      .from("users")
      .select("role")
      .eq("id", requester.id)
      .single();
    if (roleErr || requesterProfile?.role !== "Admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch branding details
    const { data, error } = await admin
      .from("company_details")
      .select("companylegalname, companytradingname, logourl, logowidth, logoheight, logofit")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("get-branding: DB error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyName =
      (data?.companylegalname as string | null) ??
      (data?.companytradingname as string | null) ??
      "Your Company";

    const payload = {
      companyName,
      logoUrl: (data?.logourl as string | null) ?? null,
      logoWidth: typeof data?.logowidth === "number" ? (data!.logowidth as number) : null,
      logoHeight: typeof data?.logoheight === "number" ? (data!.logoheight as number) : null,
      logoFit: ((data?.logofit as string | null) ?? "contain") as "contain" | "cover" | "fill" | "none" | "scale-down",
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-branding: Unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});