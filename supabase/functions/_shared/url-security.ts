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

/** IPv6 ULA / link-local / loopback / mapped private IPv4. */
function isPrivateOrReservedIpv6(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "::1" || h === "0:0:0:0:0:0:0:1") return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4-mapped IPv6 ::ffff:a.b.c.d
  const mapped = h.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (mapped) {
    const parts = mapped.slice(1, 5).map((part) => Number(part));
    if (parts.some((part) => part > 255)) return true;
    return isPrivateOrReservedIpv4(parts[0], parts[1], parts[2], parts[3]);
  }
  return false;
}

function parseIpv4Literal(hostname: string): [number, number, number, number] | null {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const parts = match.slice(1, 5).map((part) => Number(part));
  if (parts.some((part) => part > 255)) return null;
  return [parts[0], parts[1], parts[2], parts[3]];
}

export type SafeUrlResult = { ok: true; url: URL } | { ok: false; error: string };

export type SafeUrlOptions = {
  /**
   * Host allowlist from BIOMETRIC_ALLOWED_HOSTS.
   * - off: do not check (logo/branding fetches)
   * - optional: check only when the secret is set (legacy fail-open)
   * - required: empty secret fails closed (biometric proxy)
   */
  allowlist?: "off" | "optional" | "required";
};

function readAllowlist(): string[] {
  const allowlistRaw = Deno.env.get("BIOMETRIC_ALLOWED_HOSTS") || "";
  return allowlistRaw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function applyAllowlist(hostname: string, mode: SafeUrlOptions["allowlist"]): SafeUrlResult | null {
  if (mode === "off") return null;

  const allowlist = readAllowlist();
  if (mode === "required" && allowlist.length === 0) {
    return {
      ok: false,
      error: "BIOMETRIC_ALLOWED_HOSTS is not configured. Set the Edge secret to an allowed hostname (e.g. pbx.compu-e.co.za).",
    };
  }

  if (allowlist.length > 0 && !allowlist.includes(hostname)) {
    return { ok: false, error: "Biometric API host is not on the allowlist." };
  }

  return null;
}

/** Synchronous static checks (protocol, credentials, literal private IPs, allowlist). */
export function assertSafeOutboundUrl(
  raw: string,
  options: SafeUrlOptions = {}
): SafeUrlResult {
  const allowlistMode = options.allowlist ?? "optional";

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

  if (isPrivateOrReservedIpv6(hostname)) {
    return { ok: false, error: "Private network URLs are not allowed." };
  }

  const ipv4 = parseIpv4Literal(hostname);
  if (hostname.match(/^\d{1,3}(?:\.\d{1,3}){3}$/)) {
    if (!ipv4) {
      return { ok: false, error: "Invalid IP address." };
    }
    if (isPrivateOrReservedIpv4(...ipv4)) {
      return { ok: false, error: "Private or reserved IP addresses are not allowed." };
    }
  }

  const allowlistError = applyAllowlist(hostname, allowlistMode);
  if (allowlistError) return allowlistError;

  return { ok: true, url };
}

/**
 * Resolve A/AAAA for hostnames and reject private/reserved IPs (DNS rebinding defense).
 * Literal IPs are already checked synchronously.
 */
export async function assertSafeOutboundUrlAsync(
  raw: string,
  options: SafeUrlOptions = {}
): Promise<SafeUrlResult> {
  const staticCheck = assertSafeOutboundUrl(raw, options);
  if (!staticCheck.ok) return staticCheck;

  const hostname = staticCheck.url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (parseIpv4Literal(hostname) || hostname.includes(":")) {
    return staticCheck;
  }

  try {
    const [aRecords, aaaaRecords] = await Promise.all([
      Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
      Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
    ]);

    const addresses = [...aRecords, ...aaaaRecords];
    if (addresses.length === 0) {
      return { ok: false, error: "Hostname could not be resolved." };
    }

    for (const address of addresses) {
      const ipv4 = parseIpv4Literal(address);
      if (ipv4 && isPrivateOrReservedIpv4(...ipv4)) {
        return { ok: false, error: "Hostname resolves to a private or reserved IP address." };
      }
      if (!ipv4 && isPrivateOrReservedIpv6(address)) {
        return { ok: false, error: "Hostname resolves to a private or reserved IP address." };
      }
    }
  } catch {
    return { ok: false, error: "Hostname DNS lookup failed." };
  }

  return staticCheck;
}

export function normalizeUrlForCompare(raw: string): string {
  const parsed = assertSafeOutboundUrl(raw, { allowlist: "off" });
  if (!parsed.ok) return raw.trim();
  const url = parsed.url;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return `${url.protocol}//${url.host}${path}${url.search}`;
}
