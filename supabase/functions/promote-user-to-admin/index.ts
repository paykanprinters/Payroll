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
    const email: string | undefined = body?.email
    const overrideToken: string | undefined = body?.override_token

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Verify caller
    const authHeader = req.headers.get("Authorization")
    let requesterId: string | null = null
    let requesterIsAdmin = false

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "")
      // Use anon to decode token to a user
      const anon = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
      const { data: { user }, error } = await anon.auth.getUser()
      if (!error && user) {
        requesterId = user.id
        // Check role
        const { data: profile } = await admin.from("users").select("role").eq("id", user.id).maybeSingle()
        requesterIsAdmin = profile?.role === "Admin"
      }
    }

    // Determine if there is any admin in the system
    const { data: anyAdminRows } = await admin.from("users").select("id").eq("role", "Admin").limit(1)
    const anyAdminExists = Array.isArray(anyAdminRows) && anyAdminRows.length > 0

    // Bootstrap override if no admin exists
    if (!anyAdminExists) {
      const expectedOverride = Deno.env.get("PROMOTE_OVERRIDE_TOKEN")
      if (!expectedOverride || overrideToken !== expectedOverride) {
        return new Response(JSON.stringify({ error: "Forbidden (no admins exist and override token invalid/missing)" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    } else {
      // When at least one admin exists, caller must be admin
      if (!requesterIsAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden (admin only)" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    // Promote by email
    const { data: userRow, error: findErr } = await admin.from("users").select("id, email, role").eq("email", email).maybeSingle()
    if (findErr || !userRow) {
      return new Response(JSON.stringify({ error: "User not found in public.users" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (userRow.role === "Admin") {
      return new Response(JSON.stringify({ ok: true, message: "User already Admin" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { error: updateErr } = await admin.from("users").update({ role: "Admin" }).eq("id", userRow.id)
    if (updateErr) {
      return new Response(JSON.stringify({ error: `Update failed: ${updateErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (e) {
    console.error("promote-user-to-admin error:", e)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})