import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require Authorization header (manual auth)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const taxYear: number = body?.taxYear;

    if (!taxYear || typeof taxYear !== "number") {
      return new Response(JSON.stringify({ error: "Invalid or missing taxYear" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Example SARS table (replace with real data source when available)
    // PAYE brackets (aligned with 2025/2026 SARS table)
    const payeBrackets = [
      { min_income: 1, max_income: 237100, rate: 0.18, deduction: 0 },
      { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
      { min_income: 370501, max_income: 512800, rate: 0.31, deduction: 77362 },
      { min_income: 512801, max_income: 673000, rate: 0.36, deduction: 121475 },
      { min_income: 673001, max_income: 857900, rate: 0.39, deduction: 179147 },
      { min_income: 857901, max_income: 1817000, rate: 0.41, deduction: 251258 },
      { min_income: 1817001, max_income: null, rate: 0.45, deduction: 644489 },
    ];

    // UIF/SDL rates example
    const uifSdlRates = {
      tax_year: taxYear,
      uif_rate: 0.01,
      uif_cap: 177.12, // Monthly cap
      sdl_rate: 0.01,
    };

    // Tax year details (+ rebates)
    const startDate = `${taxYear}-03-01`;
    const endDate = `${taxYear + 1}-02-28`;
    const taxYearDetails = {
      year: taxYear,
      start_date: startDate,
      end_date: endDate,
      description: "SARS Tax Year",
      rebates: {
        under65: 16425,
        sixtyFiveToSeventyFour: 9033,
        seventyFivePlus: 2994,
      },
    };

    // Upsert tax_years
    {
      const { error } = await supabaseAdmin
        .from("tax_years")
        .upsert(taxYearDetails, { onConflict: "year" });
      if (error) {
        console.error("tax_years upsert error:", error);
        return new Response(JSON.stringify({ error: "Failed to upsert tax_years", details: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Replace PAYE brackets for this year (delete+insert to avoid conflicts)
    {
      const { error: delErr } = await supabaseAdmin
        .from("tax_brackets_paye")
        .delete()
        .eq("tax_year", taxYear);
      if (delErr) {
        console.error("tax_brackets_paye delete error:", delErr);
        return new Response(JSON.stringify({ error: "Failed to clear PAYE brackets", details: delErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const insertRows = payeBrackets.map((b) => ({
        tax_year: taxYear,
        min_income: b.min_income,
        max_income: b.max_income,
        rate: b.rate,
        deduction: b.deduction,
      }));

      const { error: insErr } = await supabaseAdmin
        .from("tax_brackets_paye")
        .insert(insertRows);
      if (insErr) {
        console.error("tax_brackets_paye insert error:", insErr);
        return new Response(JSON.stringify({ error: "Failed to insert PAYE brackets", details: insErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Replace UIF/SDL rates for this year (delete+insert)
    {
      const { error: delErr } = await supabaseAdmin
        .from("tax_rates_uif_sdl")
        .delete()
        .eq("tax_year", taxYear);
      if (delErr) {
        console.error("tax_rates_uif_sdl delete error:", delErr);
        return new Response(JSON.stringify({ error: "Failed to clear UIF/SDL rates", details: delErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { error: insErr } = await supabaseAdmin
        .from("tax_rates_uif_sdl")
        .insert(uifSdlRates);
      if (insErr) {
        console.error("tax_rates_uif_sdl insert error:", insErr);
        return new Response(JSON.stringify({ error: "Failed to insert UIF/SDL rates", details: insErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // NEW: Persist the selected tax year as active in company_details (singleton)
    {
      const { error: upsertErr } = await supabaseAdmin
        .from("company_details")
        .upsert({
          id: "00000000-0000-0000-0000-000000000000",
          active_tax_year: taxYear,
        }, { onConflict: "id" });
      if (upsertErr) {
        console.error("company_details active_tax_year upsert error:", upsertErr);
        return new Response(JSON.stringify({ error: "Failed to set active tax year", details: upsertErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, year: taxYear }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Unhandled error in fetch-sars-tax-tables:", e);
    return new Response(JSON.stringify({ error: "Unhandled error", details: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});