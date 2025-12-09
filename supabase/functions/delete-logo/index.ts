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
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
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

  // Get caller
  const anon = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: auth, error: userErr } = await anon.auth.getUser()
  const user = auth?.user
  if (userErr || !user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }

  // Verify admin
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileErr } = await admin.from("users").select("role").eq("id", user.id).single()
  if (profileErr || profile?.role !== "Admin") {
    return new Response("Forbidden", { status: 403, headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders })
  }

  const path: string | undefined = body?.path
  if (!path || typeof path !== "string") {
    return new Response("Invalid payload: path required", { status: 400, headers: corsHeaders })
  }

  // Enforce tenant-specific namespace
  const expectedPrefix = `logos/${user.id}/`
  if (!path.startsWith(expectedPrefix)) {
    return new Response("Forbidden path", { status: 403, headers: corsHeaders })
  }

  const bucket = "company-logos"
  const { error: delErr } = await admin.storage.from(bucket).remove([path])
  if (delErr && delErr.message !== "The resource was not found") {
    return new Response(`Failed to delete: ${delErr.message}`, { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})