import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { getCorsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"))

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    console.error("[bootstrap-admins] Missing Authorization header")
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
  }

  // Client bound to the caller's Bearer token (for user lookup)
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  // Admin client (service role) to perform privileged updates
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Get caller identity
  const { data: userResult, error: userErr } = await supabaseAuth.auth.getUser()
  if (userErr || !userResult?.user) {
    console.error("[bootstrap-admins] Failed to get user from token", { error: userErr })
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders })
  }

  const callerId = userResult.user.id
  const callerEmail = userResult.user.email ?? ""
  console.log("[bootstrap-admins] Caller identified", { callerId, callerEmail })

  // Check if caller is already Admin
  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from("users")
    .select("role, email")
    .eq("id", callerId)
    .maybeSingle()

  const callerIsAdmin = !!callerProfile && callerProfile.role === "Admin"
  console.log("[bootstrap-admins] Caller admin check", { callerIsAdmin })

  // Bootstrap allowlist: these accounts may promote ONLY THEMSELVES when no
  // admin exists yet. Promoting arbitrary emails always requires an Admin caller.
  const defaultAllowlist = ["info@kanprinters.co.za"]
  const callerAllowlisted = defaultAllowlist.includes(callerEmail)

  if (!callerIsAdmin && !callerAllowlisted) {
    console.error("[bootstrap-admins] Caller not authorized to invoke", { callerEmail })
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders })
  }

  let targetEmails: string[]
  if (callerIsAdmin) {
    targetEmails = defaultAllowlist
    try {
      const body = await req.json().catch(() => ({}))
      if (Array.isArray(body?.emails) && body.emails.length > 0) {
        targetEmails = body.emails.filter((e: unknown): e is string => typeof e === "string")
      }
    } catch {
      // ignore malformed body
    }
  } else {
    // Allowlisted non-admin: self-promotion only, request body is ignored.
    targetEmails = [callerEmail]
  }

  // Promote each target email to Admin + Active
  const results: Array<{ email: string; updated: boolean; reason?: string }> = []
  for (const email of targetEmails) {
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("users")
      .select("id, role, status")
      .eq("email", email)
      .maybeSingle()

    if (fetchErr) {
      console.error("[bootstrap-admins] Fetch error", { email, error: fetchErr })
      results.push({ email, updated: false, reason: "Fetch error" })
      continue
    }

    if (!existing) {
      console.warn("[bootstrap-admins] No profile found for email", { email })
      results.push({ email, updated: false, reason: "No user profile" })
      continue
    }

    if (existing.role === "Admin" && existing.status === "Active") {
      console.log("[bootstrap-admins] Already admin/active", { email })
      results.push({ email, updated: true, reason: "Already Admin" })
      continue
    }

    const { error: updateErr } = await supabaseAdmin
      .from("users")
      .update({ role: "Admin", status: "Active" })
      .eq("email", email)

    if (updateErr) {
      console.error("[bootstrap-admins] Update error", { email, error: updateErr })
      results.push({ email, updated: false, reason: "Update error" })
      continue
    }

    console.log("[bootstrap-admins] Promoted to Admin", { email })
    results.push({ email, updated: true })
  }

  return new Response(JSON.stringify({ results }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } })
})