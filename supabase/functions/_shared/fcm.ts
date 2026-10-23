/**
 * Firebase Cloud Messaging (HTTP v1) using a service-account key stored in the
 * FIREBASE_SERVICE_ACCOUNT secret (the full JSON file contents).
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function readServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function base64UrlEncode(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlEncode(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    })
  );
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`)
  );
  const assertion = `${header}.${claims}.${base64UrlEncode(signature)}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google auth failed: ${json.error ?? res.status}`);
  }
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
  return json.access_token;
}

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Must match a channel the app creates (see src/lib/staff-push.ts). */
  androidChannelId?: string;
}

export interface PushResult {
  ok: boolean;
  /** Token is no longer valid (app uninstalled / data cleared) and should be removed. */
  invalidToken?: boolean;
  error?: string;
}

export async function sendPush(account: ServiceAccount, message: PushMessage): Promise<PushResult> {
  const accessToken = await getAccessToken(account);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: message.token,
          notification: { title: message.title, body: message.body },
          data: message.data ?? {},
          android: {
            priority: "high",
            notification: {
              sound: "default",
              ...(message.androidChannelId ? { channel_id: message.androidChannelId } : {}),
            },
          },
        },
      }),
    }
  );
  if (res.ok) return { ok: true };

  const json = (await res.json().catch(() => ({}))) as {
    error?: { status?: string; message?: string; details?: { errorCode?: string }[] };
  };
  const errorCode = json.error?.details?.find((d) => d.errorCode)?.errorCode;
  const invalidToken =
    res.status === 404 ||
    errorCode === "UNREGISTERED" ||
    (errorCode === "INVALID_ARGUMENT" && /token/i.test(json.error?.message ?? ""));
  return {
    ok: false,
    invalidToken,
    error: json.error?.message ?? `FCM error ${res.status}`,
  };
}
