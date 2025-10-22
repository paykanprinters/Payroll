import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock SARS tax data for demonstration purposes
const mockSarsTaxData: { [year: string]: any } = {
  "2024": {
    taxYearDetails: {
      year: 2024,
      start_date: "2024-03-01",
      end_date: "2025-02-28",
      description: "SARS Tax Year 2024/2025",
    },
    payeBrackets: [
      { min_income: 0, max_income: 237100, rate: 0.18, deduction: 0 },
      { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
      { min_income: 370501, max_income: 512800, rate: 0.31, deduction: 77362 },
      { min_income: 512801, max_income: 673100, rate: 0.36, deduction: 121424 },
      { min_income: 673101, max_income: 857900, rate: 0.41, deduction: 179147 },
      { min_income: 857901, max_income: 1817000, rate: 0.45, deduction: 255073 },
      { min_income: 1817001, max_income: null, rate: 0.45, deduction: 681403 }, // Highest bracket
    ],
    uifSdlRates: {
      uif_rate: 0.01,
      uif_cap: 177.12, // Monthly cap (1% of R17712)
      sdl_rate: 0.01,
    },
  },
  "2025": {
    taxYearDetails: {
      year: 2025,
      start_date: "2025-03-01",
      end_date: "2026-02-28",
      description: "SARS Tax Year 2025/2026 (Mock Data)",
    },
    payeBrackets: [
      { min_income: 0, max_income: 245000, rate: 0.18, deduction: 0 },
      { min_income: 245001, max_income: 385000, rate: 0.26, deduction: 44100 },
      { min_income: 385001, max_income: 535000, rate: 0.31, deduction: 79900 },
      { min_income: 535001, max_income: 700000, rate: 0.36, deduction: 125000 },
      { min_income: 700001, max_income: 890000, rate: 0.41, deduction: 185000 },
      { min_income: 890001, max_income: 1880000, rate: 0.45, deduction: 265000 },
      { min_income: 1880001, max_income: null, rate: 0.45, deduction: 700000 },
    ],
    uifSdlRates: {
      uif_rate: 0.01,
      uif_cap: 180.00, // Slightly increased mock cap
      sdl_rate: 0.01,
    },
  },
  "2026": {
    taxYearDetails: {
      year: 2026,
      start_date: "2026-03-01",
      end_date: "2027-02-28",
      description: "SARS Tax Year 2026/2027 (Mock Data)",
    },
    payeBrackets: [
      { min_income: 0, max_income: 250000, rate: 0.18, deduction: 0 },
      { min_income: 250001, max_income: 390000, rate: 0.26, deduction: 45000 },
      { min_income: 390001, max_income: 540000, rate: 0.31, deduction: 81000 },
      { min_income: 540001, max_income: 710000, rate: 0.36, deduction: 127000 },
      { min_income: 710001, max_income: 900000, rate: 0.41, deduction: 188000 },
      { min_income: 900001, max_income: 1900000, rate: 0.45, deduction: 270000 },
      { min_income: 1900001, max_income: null, rate: 0.45, deduction: 710000 },
    ],
    uifSdlRates: {
      uif_rate: 0.01,
      uif_cap: 185.00, // Slightly increased mock cap
      sdl_rate: 0.01,
    },
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { taxYear } = await req.json();

    if (!taxYear) {
      return new Response(JSON.stringify({ error: 'Tax year is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify if the current user making the request is an Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      console.error('Error getting requesting user:', userError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: requestingUserProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || requestingUserProfile?.role !== 'Admin') {
      console.error('User is not an Admin or profile not found:', profileError);
      return new Response('Forbidden: Only Admins can fetch and apply tax tables.', { status: 403, headers: corsHeaders });
    }

    const taxData = mockSarsTaxData[taxYear];

    if (!taxData) {
      return new Response(JSON.stringify({ error: `No mock tax data available for year ${taxYear}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Upsert tax_years entry
    const { data: upsertedTaxYear, error: taxYearError } = await supabaseAdmin
      .from('tax_years')
      .upsert(taxData.taxYearDetails, { onConflict: 'year' })
      .select()
      .single();

    if (taxYearError) {
      console.error(`Error upserting tax_years for ${taxYear}:`, taxYearError);
      return new Response(JSON.stringify({ error: `Failed to save tax year details: ${taxYearError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Delete existing brackets and rates for the year to ensure fresh data
    await supabaseAdmin.from('tax_brackets_paye').delete().eq('tax_year', taxYear);
    await supabaseAdmin.from('tax_rates_uif_sdl').delete().eq('tax_year', taxYear);

    // Insert PAYE brackets
    const payeBracketsWithYear = taxData.payeBrackets.map((bracket: any) => ({
      ...bracket,
      tax_year: taxYear,
    }));
    const { error: payeError } = await supabaseAdmin
      .from('tax_brackets_paye')
      .insert(payeBracketsWithYear);

    if (payeError) {
      console.error(`Error inserting PAYE brackets for ${taxYear}:`, payeError);
      return new Response(JSON.stringify({ error: `Failed to save PAYE brackets: ${payeError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Insert UIF/SDL rates
    const uifSdlRatesWithYear = { ...taxData.uifSdlRates, tax_year: taxYear };
    const { error: uifSdlError } = await supabaseAdmin
      .from('tax_rates_uif_sdl')
      .insert(uifSdlRatesWithYear);

    if (uifSdlError) {
      console.error(`Error inserting UIF/SDL rates for ${taxYear}:`, uifSdlError);
      return new Response(JSON.stringify({ error: `Failed to save UIF/SDL rates: ${uifSdlError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: `Tax tables for ${taxYear} fetched and applied successfully!` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in fetch-sars-tax-tables Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});