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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("get-branding: Missing Supabase environment variables.");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
});