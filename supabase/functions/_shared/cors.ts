/** Production + local dev origins when ALLOWED_ORIGINS is unset (never reflect arbitrary origins). */
const FALLBACK_ALLOWED_ORIGINS = [
  "https://payroll.kanprinters.co.za",
  "https://payroll-beta-orcin.vercel.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function resolveAllowedOrigins(): string[] {
  const fromEnv = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : FALLBACK_ALLOWED_ORIGINS;
}

/** Reflect request origin when allowlisted; omit wildcard for admin endpoints. */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = resolveAllowedOrigins();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}
