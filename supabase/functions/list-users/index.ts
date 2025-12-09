import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  try {
    let overrideToken: string | undefined
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}))
      overrideToken = body?.override_token
    }

    // Check if any admin exists
    const { data: anyAdminRows } = await admin.from("users").select("id").eq("role", "Admin").limit(1)
    const anyAdminExists = Array.isArray(anyAdminRows) && anyAdminRows.length > 0

    // If admins exist, require caller to be admin
    if (anyAdminExists) {
      const authHeader = req.headers.get("Authorization")
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const token = authHeader.replace("Bearer ", "")
      const anon = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: { user }, error } = await anon.auth.getUser()
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle()
      if (profile?.role !== "Admin") {
        return new Response(JSON.stringify({ error: "Forbidden (admin only)" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
    } else {
      // If no admin exists, require valid override token
      const expected = Deno.env.get("PROMOTE_OVERRIDE_TOKEN")
      if (!expected || overrideToken !== expected) {
        return new Response(JSON.stringify({ error: "Forbidden (no admins; override token required)" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
    }

    const { data, error: listErr } = await admin
      .from("users")
      .select("id, email, role, status, created_at")
      .order("created_at", { ascending: false })
    if (listErr) {
      return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ ok: true, users: data ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (e) {
    console.error("list-users error:", e)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})