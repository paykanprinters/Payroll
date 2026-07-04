// Shared SMS Portal (smsportal.com) REST v3 helper for edge functions.
// Credentials are read from secrets (SMSPORTAL_CLIENT_ID / SMSPORTAL_API_SECRET)
// and never shipped to the client.

const SMSPORTAL_BASE = "https://rest.smsportal.com/v3";

export interface SmsMessage {
  /** International MSISDN, e.g. 27821234567 (no +). */
  destination: string;
  content: string;
}

export interface SendSmsInput {
  messages: SmsMessage[];
  /** When true, SMS Portal validates but does not deliver or bill. */
  testMode?: boolean;
  /** Optional alphanumeric/numeric sender ID configured on the account. */
  senderId?: string;
}

export interface SendSmsResult {
  ok: boolean;
  /** Provider event/batch id when available. */
  id?: string;
  /** Number of messages SMS Portal accepted. */
  accepted?: number;
  error?: string;
}

export function isSmsPortalConfigured(): boolean {
  return !!Deno.env.get("SMSPORTAL_CLIENT_ID") && !!Deno.env.get("SMSPORTAL_API_SECRET");
}

/**
 * Normalize a South African mobile number to SMS Portal's international format.
 * Accepts 0XXXXXXXXX, 27XXXXXXXXX, +27XXXXXXXXX (spaces/dashes ignored).
 * Returns 27XXXXXXXXX or null when not a valid SA mobile number.
 */
export function normalizeSaMsisdn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);

  if (digits.startsWith("0") && digits.length === 10) {
    digits = "27" + digits.slice(1);
  } else if (digits.startsWith("27") && digits.length === 11) {
    // already international
  } else {
    return null;
  }

  // SA mobile numbers start 27 followed by 6/7/8 and 8 more digits.
  if (!/^27[6-8]\d{8}$/.test(digits)) return null;
  return digits;
}

/** Sends one or more SMS messages via SMS Portal. Returns a structured result. */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const clientId = Deno.env.get("SMSPORTAL_CLIENT_ID");
  const apiSecret = Deno.env.get("SMSPORTAL_API_SECRET");
  if (!clientId || !apiSecret) {
    return { ok: false, error: "SMS Portal credentials are not configured on the server." };
  }
  if (input.messages.length === 0) {
    return { ok: false, error: "No messages to send." };
  }

  const auth = btoa(`${clientId}:${apiSecret}`);
  const payload: Record<string, unknown> = { messages: input.messages };
  if (input.testMode) payload.testMode = true;
  if (input.senderId) {
    payload.sendOptions = { senderId: input.senderId };
  }

  try {
    const res = await fetch(`${SMSPORTAL_BASE}/bulkmessages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `SMS Portal ${res.status}: ${text.slice(0, 500)}` };
    }

    let data: { eventId?: string; cost?: unknown; messages?: unknown[] } = {};
    try {
      data = JSON.parse(text);
    } catch {
      // non-JSON success body; treat as accepted
    }
    const accepted = Array.isArray(data.messages) ? data.messages.length : input.messages.length;
    return { ok: true, id: data.eventId ? String(data.eventId) : undefined, accepted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error calling SMS Portal" };
  }
}
