import { FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

export type FunctionErrorServiceHint = "email" | "sms" | "welcome" | "generic";

type ParseFunctionErrorOptions = {
  /** Narrows the fallback copy when the Edge body cannot be read. */
  service?: FunctionErrorServiceHint;
};

function fallbackForService(service: FunctionErrorServiceHint, message: string): string {
  if (message.includes("Failed to send a request to the Edge Function")) {
    if (service === "email") {
      return "The email service is not available. Confirm the send-payslip-email edge function is deployed.";
    }
    if (service === "sms") {
      return "The SMS service is not available. Confirm the send-sms edge function is deployed.";
    }
    if (service === "welcome") {
      return "The welcome notification service is not available. Confirm send-employee-welcome is deployed.";
    }
    return "The requested service is not available. Ask your administrator to check Edge Function deployment.";
  }

  if (message === "Edge Function returned a non-2xx status code") {
    if (service === "email") {
      return "The email service rejected the request. Check Settings → Notifications: save a verified sender address, then try again.";
    }
    if (service === "sms") {
      return "The SMS service rejected the request. Check Settings → Notifications and SMS Portal credentials.";
    }
    if (service === "welcome") {
      return "The welcome notification service rejected the request. Check email/SMS provider settings.";
    }
    return "The server rejected the request. Check the related Settings page and try again.";
  }

  if (/function not found|404|send-employee-welcome/i.test(message) && service === "welcome") {
    return "The welcome notification service is not deployed yet. Ask your administrator to deploy the send-employee-welcome edge function.";
  }

  return message || "The server rejected the request.";
}

async function readErrorBody(error: unknown): Promise<{ error?: string; message?: string } | null> {
  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object") {
        return body as { error?: string; message?: string };
      }
    } catch {
      // ignore malformed body
    }
    return null;
  }

  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : undefined;

  if (context && typeof context === "object" && "body" in context) {
    const body = (context as { body?: unknown }).body;
    if (typeof body === "string" && body.trim()) {
      try {
        return JSON.parse(body) as { error?: string; message?: string };
      } catch {
        return null;
      }
    }
  }

  return null;
}

/** Extract a human-readable message from a Supabase Edge Function invoke error. */
export async function parseFunctionError(
  error: unknown,
  data?: unknown,
  options: ParseFunctionErrorOptions = {}
): Promise<string> {
  const service = options.service ?? "generic";

  const dataError =
    data && typeof data === "object" && "error" in data
      ? String((data as { error?: unknown }).error ?? "")
      : "";
  if (dataError) return dataError;

  const body = await readErrorBody(error);
  if (typeof body?.error === "string" && body.error.trim()) return body.error;
  if (typeof body?.message === "string" && body.message.trim()) return body.message;

  const message =
    error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : "The server rejected the request.";

  return fallbackForService(service, message);
}
