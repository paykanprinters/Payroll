import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const allowedOrigins = [Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173"]

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  }
}

serve(async (req) => {
  const origin = req.headers.get("Origin")
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === "OPTIONS") {
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response("Forbidden origin", { status: 403, headers: corsHeaders })
    }
    return new Response(null, { headers: corsHeaders })
  }

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response("Forbidden origin", { status: 403, headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }
  const token = authHeader.replace("Bearer ", "")

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }

  const { data: isAdminData } = await supabase.rpc("is_admin")
  const isAdmin = Boolean(isAdminData)

  const body = await req.json()
  const { records } = body ?? {}
  if (!Array.isArray(records)) {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders })
  }

  // Enforce: non-admins can only upsert their own employee_id records
  const safeRecords = isAdmin
    ? records
    : records.filter((r) => r && r.employee_id === user.id)

  if (safeRecords.length === 0) {
    return new Response(JSON.stringify({ ok: true, count: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { data, error } = await supabase
    .from("timesheets")
    .upsert(safeRecords, { onConflict: "employee_id,date" })
    .select("id")

  if (error) {
    return new Response(`Upsert failed: ${error.message}`, { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true, count: data?.length ?? 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})