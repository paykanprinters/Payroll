import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }
  const token = authHeader.replace("Bearer ", "")

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const anon = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: userErr } = await anon.auth.getUser()
  if (userErr || !user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileErr } = await admin.from("users").select("role").eq("id", user.id).single()
  if (profileErr || profile?.role !== "Admin") {
    return new Response("Forbidden", { status: 403, headers: corsHeaders })
  }

  const body = await req.json()
  const { target_user_id, metadata } = body ?? {}
  if (typeof target_user_id !== "string" || typeof metadata !== "object" || metadata === null) {
    return new Response("Invalid payload", { status: 400, headers: corsHeaders })
  }

  const { role: _omitRole, status: _omitStatus, ...safeMetadata } = metadata as Record<string, unknown>

  const { error } = await admin.auth.admin.updateUserById(target_user_id, { user_metadata: safeMetadata })
  if (error) {
    return new Response(`Failed to update metadata: ${error.message}`, { status: 400, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})