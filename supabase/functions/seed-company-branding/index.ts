import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const BUCKET = "company-logos";
const OBJECT_PATH = "company_logo.png";
const COMPANY_ID = "00000000-0000-0000-0000-000000000000";

type SeedBody = {
  logoBase64?: string;
  sourceUrl?: string;
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userResult, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userResult?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userResult.user.id)
    .maybeSingle();

  if (profile?.role !== "Admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  let body: SeedBody = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    body = {};
  }

  let bytes: Uint8Array;
  if (body.logoBase64) {
    const raw = body.logoBase64.includes(",") ? body.logoBase64.split(",").pop()! : body.logoBase64;
    bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } else {
    const sourceUrl =
      body.sourceUrl ||
      Deno.env.get("SEED_LOGO_SOURCE_URL") ||
      "https://payroll-beta-orcin.vercel.app/brand/kanprinters_horizontal_color.png";
    const fetched = await fetch(sourceUrl);
    if (!fetched.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch logo from ${sourceUrl}`, status: fetched.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    bytes = new Uint8Array(await fetched.arrayBuffer());
  }

  const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(OBJECT_PATH, bytes, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });

  if (uploadError) {
    console.error("[seed-company-branding] upload error:", uploadError);
    return new Response(JSON.stringify({ error: uploadError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);
  const logoUrl = publicUrlData.publicUrl;
  const logoWidth = 180;
  const logoHeight = 60;
  const logoFit = "contain";

  const { error: companyError } = await supabaseAdmin
    .from("company_details")
    .upsert(
      {
        id: COMPANY_ID,
        logourl: logoUrl,
        logowidth: logoWidth,
        logoheight: logoHeight,
        logofit: logoFit,
      },
      { onConflict: "id" }
    );

  if (companyError) {
    console.error("[seed-company-branding] company_details error:", companyError);
    return new Response(JSON.stringify({ error: companyError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: designRows, error: designSelectError } = await supabaseAdmin
    .from("payslip_design_settings")
    .select("id, user_id");

  if (designSelectError) {
    console.error("[seed-company-branding] payslip_design_settings select error:", designSelectError);
    return new Response(JSON.stringify({ error: designSelectError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (designRows && designRows.length > 0) {
    const { error: designUpdateError } = await supabaseAdmin
      .from("payslip_design_settings")
      .update({
        payslip_logo_url: logoUrl,
        payslip_logo_width: logoWidth,
        payslip_logo_height: logoHeight,
        payslip_logo_fit: logoFit,
        show_company_logo: true,
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (designUpdateError) {
      console.error("[seed-company-branding] payslip_design_settings update error:", designUpdateError);
      return new Response(JSON.stringify({ error: designUpdateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      logoUrl,
      logoWidth,
      logoHeight,
      logoFit,
      payslipRowsUpdated: designRows?.length ?? 0,
      bytesUploaded: bytes.byteLength,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
