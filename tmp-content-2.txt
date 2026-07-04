// Shared Resend email helper for edge functions.
// The API key is read from the RESEND_API_KEY secret and never shipped to the client.

export interface ResendAttachment {
  filename: string;
  /** Base64-encoded file content (no data: prefix). */
  content: string;
}

export interface SendEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string | string[];
  attachments?: ResendAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function isResendConfigured(): boolean {
  return !!Deno.env.get("RESEND_API_KEY");
}

/** Sends a single email through Resend. Returns a structured result instead of throwing. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured on the server." };
  }

  const payload: Record<string, unknown> = {
    from: input.from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) payload.reply_to = input.replyTo;
  if (input.cc) payload.cc = Array.isArray(input.cc) ? input.cc : [input.cc];
  if (input.attachments && input.attachments.length > 0) {
    payload.attachments = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    }));
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${text.slice(0, 500)}` };
    }

    const data = await res.json().catch(() => ({}));
    return { ok: true, id: (data as { id?: string })?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error calling Resend" };
  }
}
