const DEFAULT_ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Reflect request origin when allowlisted; omit wildcard for admin endpoints. */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (origin && (DEFAULT_ALLOWED_ORIGINS.length === 0 || DEFAULT_ALLOWED_ORIGINS.includes(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}
