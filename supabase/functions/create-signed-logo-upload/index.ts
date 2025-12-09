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

  const anon = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user }, error: userErr } = await anon.auth.getUser()
  if (userErr || !user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders })
  }

  // Admin-only: verify against trusted users table
  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile, error: profileErr } = await admin.from("users").select("role").eq("id", user.id).single()
  if (profileErr || profile?.role !== "Admin") {
    return new Response("Forbidden", { status: 403, headers: corsHeaders })
  }

  const body = await req.json()
  const originalName: string | undefined = body?.fileName
  if (!originalName || typeof originalName !== "string") {
    return new Response("Invalid payload: fileName required", { status: 400, headers: corsHeaders })
  }

  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const unique = `${Date.now()}_${crypto.randomUUID()}_${sanitizedName}`
  const bucket = "company-logos"
  const path = `logos/${user.id}/${unique}`

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) {
    return new Response(`Failed to create signed upload URL: ${error?.message ?? "Unknown error"}`, { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ bucket, path, token: data.token }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})