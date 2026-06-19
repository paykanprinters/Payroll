import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { assertSafeOutboundUrl, normalizeUrlForCompare } from "../_shared/url-security.ts";

/** Upstream biometric API can be slow when returning full attendance logs. */
const FETCH_TIMEOUT_MS = 90_000;
const MAX_UPSTREAM_BYTES = 5 * 1024 * 1024;
const MAX_RETURNED_LOG_CHARS = 2 * 1024 * 1024;

function extractLogText(body: unknown): string {
  if (typeof body === "string") return body;
  if (Array.isArray(body)) {
    return body.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["logs", "data", "entries", "items", "lines", "content", "text"]) {
      const value = record[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return extractLogText(value);
    }
    return JSON.stringify(body);
  }
  return String(body ?? "");
}

async function readLimitedBody(response: Response): Promise<string> {
  const buf = await response.arrayBuffer();
  if (buf.byteLength > MAX_UPSTREAM_BYTES) {
    throw new Error("UPSTREAM_TOO_LARGE");
  }

  const contentType = response.headers.get("content-type") || "";
  const text = new TextDecoder().decode(buf);

  if (contentType.includes("application/json")) {
    try {
      return extractLogText(JSON.parse(text));
    } catch {
      return text;
    }
  }

  return text;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role !== "Admin" && role !== "Manager") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: { apiUrl?: string; preview?: boolean; startDate?: string; endDate?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: companyRow } = await supabase
    .from("company_details")
    .select("biometric_api_url")
    .limit(1)
    .maybeSingle();

  const storedUrl = ((companyRow as { biometric_api_url?: string | null } | null)?.biometric_api_url || "").trim();
  const requestedUrl = (payload.apiUrl || "").trim();

  let apiUrl = storedUrl || requestedUrl;
  if (!apiUrl) {
    return new Response(JSON.stringify({ error: "Biometric API URL is not configured." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (storedUrl && requestedUrl && normalizeUrlForCompare(storedUrl) !== normalizeUrlForCompare(requestedUrl)) {
    return new Response(JSON.stringify({ error: "Requested URL does not match saved biometric settings." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const safeUrl = assertSafeOutboundUrl(apiUrl);
  if (!safeUrl.ok) {
    return new Response(JSON.stringify({ error: safeUrl.error }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl.url.toString(), {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
      redirect: "manual",
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      return new Response(JSON.stringify({ error: "Biometric API redirects are not allowed." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Biometric API returned HTTP ${response.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const logText = await readLimitedBody(response);
    const lines = logText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const truncated = logText.length > MAX_RETURNED_LOG_CHARS;
    const returnedLogText = truncated ? logText.slice(0, MAX_RETURNED_LOG_CHARS) : logText;

    if (payload.preview) {
      return new Response(
        JSON.stringify({
          ok: true,
          lineCount: lines.length,
          sample: lines.slice(0, 3).join("\n"),
          truncated,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        logText: returnedLogText,
        lineCount: lines.length,
        truncated,
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message === "UPSTREAM_TOO_LARGE"
        ? "Biometric API response is too large."
        : error instanceof Error && error.name === "AbortError"
          ? `Biometric API request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds.`
          : "Failed to fetch biometric logs.";

    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(timeout);
  }
});
