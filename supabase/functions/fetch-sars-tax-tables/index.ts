import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSarsTaxTablesForYear, buildSarsTaxYearDetails } from "../_shared/sars-tax-tables.ts";

serve(async (req) => {
  const corsHeaders = {
    ...getCorsHeaders(req.headers.get("Origin")),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    console.error("fetch-sars-tax-tables: Missing Supabase environment variables.");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Manual Authorization check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester }, error: getUserErr } = await adminClient.auth.getUser(token);
    if (getUserErr || !requester) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin-only enforcement
    const { data: requesterProfile, error: roleErr } = await adminClient
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

    // Parse body
    let taxYear: number | undefined;
    try {
      const body = await req.json();
      taxYear = body?.taxYear;
    } catch {
      // If no JSON provided
      taxYear = undefined;
    }

    if (!taxYear || typeof taxYear !== "number") {
      return new Response(JSON.stringify({ error: "Invalid or missing taxYear" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selected = getSarsTaxTablesForYear(taxYear);
    if (!selected) {
      return new Response(
        JSON.stringify({
          error: `No SARS tax tables are configured for tax year ${taxYear}. Supported years: 2026, 2027.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payeBrackets = selected.payeBrackets;
    const uifSdlRates = { tax_year: taxYear, ...selected.uifSdlRates };
    const taxYearDetails = buildSarsTaxYearDetails(taxYear);
    if (!taxYearDetails) {
      return new Response(JSON.stringify({ error: `Failed to build tax year details for ${taxYear}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert tax_years
    {
      const { error } = await adminClient.from("tax_years").upsert(taxYearDetails, { onConflict: "year" });
      if (error) {
        console.error("tax_years upsert error:", error);
        return new Response(JSON.stringify({ error: "Failed to upsert tax_years", details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Replace PAYE brackets for this year
    {
      const { error: delErr } = await adminClient.from("tax_brackets_paye").delete().eq("tax_year", taxYear);
      if (delErr) {
        console.error("tax_brackets_paye delete error:", delErr);
        return new Response(JSON.stringify({ error: "Failed to clear PAYE brackets", details: delErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const insertRows = payeBrackets.map((b) => ({
        tax_year: taxYear,
        min_income: b.min_income,
        max_income: b.max_income,
        rate: b.rate,
        deduction: b.deduction,
      }));
      const { error: insErr } = await adminClient.from("tax_brackets_paye").insert(insertRows);
      if (insErr) {
        console.error("tax_brackets_paye insert error:", insErr);
        return new Response(JSON.stringify({ error: "Failed to insert PAYE brackets", details: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Replace UIF/SDL rates for this year
    {
      const { error: delErr } = await adminClient.from("tax_rates_uif_sdl").delete().eq("tax_year", taxYear);
      if (delErr) {
        console.error("tax_rates_uif_sdl delete error:", delErr);
        return new Response(JSON.stringify({ error: "Failed to clear UIF/SDL rates", details: delErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: insErr } = await adminClient.from("tax_rates_uif_sdl").insert(uifSdlRates);
      if (insErr) {
        console.error("tax_rates_uif_sdl insert error:", insErr);
        return new Response(JSON.stringify({ error: "Failed to insert UIF/SDL rates", details: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Persist selected active tax year
    {
      const { error: upsertErr } = await adminClient
        .from("company_details")
        .upsert({ id: "00000000-0000-0000-0000-000000000000", active_tax_year: taxYear }, { onConflict: "id" });
      if (upsertErr) {
        console.error("company_details active_tax_year upsert error:", upsertErr);
        return new Response(JSON.stringify({ error: "Failed to set active tax year", details: upsertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        year: taxYear,
        periodLabel: selected.periodLabel,
        sourceUrl: selected.sourceUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("Unhandled error in fetch-sars-tax-tables:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});