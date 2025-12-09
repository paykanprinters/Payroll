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

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json()
    const target_user_id: string | undefined = body?.target_user_id
    const role: string | undefined = body?.role
    const override_token: string | undefined = body?.override_token

    if (!target_user_id || typeof target_user_id !== "string" || !role || typeof role !== "string") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const normalizedRole = role === "Admin" || role === "Manager" || role === "Staff" ? role : "Staff"

    // Check if any admin exists
    const { data: anyAdminRows } = await admin.from("users").select("id").eq("role", "Admin").limit(1)
    const anyAdminExists = Array.isArray(anyAdminRows) && anyAdminRows.length > 0

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
      // No admin: require valid override token
      const expected = Deno.env.get("PROMOTE_OVERRIDE_TOKEN")
      if (!expected || override_token !== expected) {
        return new Response(JSON.stringify({ error: "Forbidden (no admins; override token required)" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
    }

    const { error: updateErr } = await admin.from("users").update({ role: normalizedRole }).eq("id", target_user_id)
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (e) {
    console.error("set-user-role error:", e)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})