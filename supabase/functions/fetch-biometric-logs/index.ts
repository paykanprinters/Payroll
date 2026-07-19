import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { assertSafeOutboundUrl, normalizeUrlForCompare } from "../_shared/url-security.ts";

/** Upstream biometric API can be slow when returning full attendance logs. */
const FETCH_TIMEOUT_MS = 90_000;
const MAX_UPSTREAM_BYTES = 5 * 1024 * 1024;
const MAX_RETURNED_LOG_CHARS = 2 * 1024 * 1024;
const UPSTREAM_ATTEMPTS = 3;
const ATTENDANCE_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;

const LOG_ARRAY_KEYS = [
  "attendance_logs",
  "attendanceLogs",
  "logs",
  "data",
  "entries",
  "items",
  "lines",
  "content",
  "text",
] as const;

function extractLogText(body: unknown): string {
  if (typeof body === "string") return body;
  if (Array.isArray(body)) {
    return body.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join("\n");
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of LOG_ARRAY_KEYS) {
      const value = record[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return extractLogText(value);
    }
    return JSON.stringify(body);
  }
  return String(body ?? "");
}

function filterLogTextByDateRange(logText: string, startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return logText;

  return logText
    .split(/\r?\n/)
    .filter((line) => {
      const match = line.match(ATTENDANCE_DATE_PATTERN);
      if (!match) return false;
      const date = match[1];
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    })
    .join("\n");
}

async function readLimitedBody(response: Response): Promise<string> {
  const buf = await response.arrayBuffer();
  if (buf.byteLength > MAX_UPSTREAM_BYTES) {
    throw new Error("UPSTREAM_TOO_LARGE");
  }

  const contentType = response.headers.get("content-type") || "";
  const text = new TextDecoder().decode(buf);

  if (contentType.includes("application/json") || text.trimStart().startsWith("{") || text.trimStart().startsWith("[")) {
    try {
      return extractLogText(JSON.parse(text));
    } catch {
      return text;
    }
  }

  return text;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUpstream(url: string, signal: AbortSignal): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= UPSTREAM_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json, text/plain, */*" },
        redirect: "manual",
        signal,
      });

      if (response.status >= 500 && attempt < UPSTREAM_ATTEMPTS) {
        await delay(400 * attempt);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (signal.aborted) throw error;
      if (attempt < UPSTREAM_ATTEMPTS) {
        await delay(400 * attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upstream fetch failed");
}

function jsonResponse(
  corsHeaders: Record<string, string>,
  body: Record<string, unknown>,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(corsHeaders, { error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse(corsHeaders, { error: "Server misconfiguration" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(corsHeaders, { error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse(corsHeaders, { error: "Unauthorized" }, 401);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role !== "Admin" && role !== "Manager") {
    return jsonResponse(corsHeaders, { error: "Forbidden" }, 403);
  }

  let payload: { apiUrl?: string; preview?: boolean; startDate?: string; endDate?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(corsHeaders, { error: "Invalid JSON body" }, 400);
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
    return jsonResponse(corsHeaders, { error: "Biometric API URL is not configured." }, 400);
  }

  if (storedUrl && requestedUrl && normalizeUrlForCompare(storedUrl) !== normalizeUrlForCompare(requestedUrl)) {
    return jsonResponse(corsHeaders, { error: "Requested URL does not match saved biometric settings." }, 403);
  }

  const safeUrl = assertSafeOutboundUrl(apiUrl);
  if (!safeUrl.ok) {
    return jsonResponse(corsHeaders, { error: safeUrl.error }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchUpstream(safeUrl.url.toString(), controller.signal);

    if (response.status >= 300 && response.status < 400) {
      return jsonResponse(corsHeaders, { error: "Biometric API redirects are not allowed." }, 502);
    }

    if (!response.ok) {
      return jsonResponse(corsHeaders, { error: `Biometric API returned HTTP ${response.status}` }, 502);
    }

    let logText = await readLimitedBody(response);
    if (!payload.preview) {
      logText = filterLogTextByDateRange(logText, payload.startDate, payload.endDate);
    }

    const lines = logText.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const truncated = logText.length > MAX_RETURNED_LOG_CHARS;
    const returnedLogText = truncated ? logText.slice(0, MAX_RETURNED_LOG_CHARS) : logText;

    if (payload.preview) {
      return jsonResponse(
        corsHeaders,
        {
          ok: true,
          lineCount: lines.length,
          sample: lines.slice(0, 3).join("\n"),
          truncated,
        },
        200
      );
    }

    return jsonResponse(
      corsHeaders,
      {
        ok: true,
        logText: returnedLogText,
        lineCount: lines.length,
        truncated,
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
      },
      200
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("fetch-biometric-logs upstream error:", detail);

    const message =
      error instanceof Error && error.message === "UPSTREAM_TOO_LARGE"
        ? "Biometric API response is too large."
        : error instanceof Error && error.name === "AbortError"
          ? `Biometric API request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds.`
          : `Failed to reach biometric API (${detail || "network error"}). Check that the clock server is online and reachable from the internet.`;

    return jsonResponse(corsHeaders, { error: message }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
