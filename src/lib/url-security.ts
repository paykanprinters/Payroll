/** Client-side URL checks before saving or invoking biometric proxy calls. */

function isPrivateOrReservedIpv4(a: number, b: number, c: number, d: number): boolean {
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function validateOutboundHttpUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Enter a valid URL (including http:// or https://)." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }

  if (url.username || url.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return { ok: false, error: "Localhost URLs are not allowed." };
  }

  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const parts = ipv4Match.slice(1, 5).map((part) => Number(part));
    if (parts.some((part) => part > 255) || isPrivateOrReservedIpv4(parts[0], parts[1], parts[2], parts[3])) {
      return { ok: false, error: "Private or reserved IP addresses are not allowed." };
    }
  }

  return { ok: true, url };
}
