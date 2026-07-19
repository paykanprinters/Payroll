import { FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { validateOutboundHttpUrl } from "@/lib/url-security";

export type FetchBiometricLogsBody = {
  apiUrl: string;
  preview?: boolean;
  startDate?: string;
  endDate?: string;
};

export type FetchBiometricLogsResult = {
  ok: boolean;
  logText?: string;
  lineCount?: number;
  sample?: string;
  startDate?: string | null;
  endDate?: string | null;
  error?: string;
  truncated?: boolean;
};

async function parseInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError || error instanceof FunctionsRelayError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === "object") {
        const record = body as { error?: unknown; message?: unknown };
        if (typeof record.error === "string" && record.error.trim()) return record.error;
        if (typeof record.message === "string" && record.message.trim()) return record.message;
      }
    } catch {
      // ignore malformed body
    }
  }

  const message =
    error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
      ? (error as { message: string }).message
      : "Could not reach the biometric proxy.";

  if (message.includes("Failed to send a request to the Edge Function")) {
    return "Biometric proxy is not available. Deploy the fetch-biometric-logs edge function to Supabase, then try again.";
  }

  if (message === "Edge Function returned a non-2xx status code") {
    return "Biometric proxy returned an error. Check Settings → Biometric API and that the clock server is online.";
  }

  return message;
}

export async function invokeFetchBiometricLogs(
  body: FetchBiometricLogsBody
): Promise<FetchBiometricLogsResult> {
  if (body.apiUrl) {
    const urlCheck = validateOutboundHttpUrl(body.apiUrl);
    if (!urlCheck.ok) {
      throw new Error(urlCheck.error);
    }
    body = { ...body, apiUrl: urlCheck.url.toString() };
  }

  // Upstream download often takes 20–30s; allow headroom for retries.
  const { data, error } = await supabase.functions.invoke("fetch-biometric-logs", {
    body,
    timeout: 120_000,
  });

  if (error) {
    throw new Error(await parseInvokeError(error));
  }

  const payload = (data || {}) as FetchBiometricLogsResult;
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}
