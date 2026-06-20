import { describe, expect, it } from "vitest";

/** Mirrors supabase/functions/_shared/cors.ts for Node/vitest. */
const FALLBACK_ALLOWED_ORIGINS = [
  "https://payroll.kanprinters.co.za",
  "https://payroll-beta-orcin.vercel.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function resolveAllowedOrigins(env: Record<string, string | undefined>): string[] {
  const fromEnv = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : FALLBACK_ALLOWED_ORIGINS;
}

function getCorsHeaders(
  origin: string | null,
  env: Record<string, string | undefined>
): Record<string, string> {
  const allowedOrigins = resolveAllowedOrigins(env);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

describe("edge CORS", () => {
  it("allows production origin by default when ALLOWED_ORIGINS is unset", () => {
    const headers = getCorsHeaders("https://payroll.kanprinters.co.za", {});
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://payroll.kanprinters.co.za"
    );
  });

  it("rejects arbitrary origins when ALLOWED_ORIGINS is unset", () => {
    const headers = getCorsHeaders("https://evil.example.com", {});
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("respects ALLOWED_ORIGINS env override", () => {
    const env = { ALLOWED_ORIGINS: "https://custom.example.com" };
    expect(getCorsHeaders("https://custom.example.com", env)["Access-Control-Allow-Origin"]).toBe(
      "https://custom.example.com"
    );
    expect(getCorsHeaders("https://payroll.kanprinters.co.za", env)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
