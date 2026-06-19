/** Guard outbound fetches from edge functions against SSRF to private/metadata targets. */

function isPrivateOrReservedIpv4(a: number, b: number, c: number, d: number): boolean {
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export type SafeUrlResult = { ok: true; url: URL } | { ok: false; error: string };

export function assertSafeOutboundUrl(raw: string): SafeUrlResult {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }

  if (url.username || url.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return { ok: false, error: "Localhost URLs are not allowed." };
  }

  if (
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd")
  ) {
    return { ok: false, error: "Private network URLs are not allowed." };
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const parts = ipv4Match.slice(1, 5).map((part) => Number(part));
    if (parts.some((part) => part > 255)) {
      return { ok: false, error: "Invalid IP address." };
    }
    if (isPrivateOrReservedIpv4(parts[0], parts[1], parts[2], parts[3])) {
      return { ok: false, error: "Private or reserved IP addresses are not allowed." };
    }
  }

  const allowlistRaw = Deno.env.get("BIOMETRIC_ALLOWED_HOSTS") || "";
  const allowlist = allowlistRaw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0 && !allowlist.includes(hostname)) {
    return { ok: false, error: "Biometric API host is not on the allowlist." };
  }

  return { ok: true, url };
}

export function normalizeUrlForCompare(raw: string): string {
  const parsed = assertSafeOutboundUrl(raw);
  if (!parsed.ok) return raw.trim();
  const url = parsed.url;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return `${url.protocol}//${url.host}${path}${url.search}`;
}
