import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const allowedOrigins = ["http://localhost:5173"]

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  // Verify JWT with anon client
  const anon = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: userErr } = await anon.auth.getUser()
  if (userErr || !user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }

  // Trusted admin check via users table with service role (do not rely on is_admin() here)
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileErr } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profileErr || profile?.role !== "Admin") {
    return new Response("Forbidden", { status: 403, headers: corsHeaders })
  }

  const payload = await req.json()
  const { target_user_id, new_password } = payload ?? {}
  if (typeof target_user_id !== "string" || typeof new_password !== "string" || new_password.length < 8) {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders })
  }

  // Use service role only after strict authz
  const { error } = await adminClient.auth.admin.updateUserById(target_user_id, { password: new_password })
  if (error) {
    return new Response(`Failed to update password: ${error.message}`, { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})