import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[send-payroll-reminders] received", body);

    // Here you would integrate with email/Slack providers.
    // For now, we accept the payload and respond OK.

    return new Response(JSON.stringify({ ok: true, count: (body?.reminders || []).length }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    console.error("[send-payroll-reminders] error", e);
    return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
});