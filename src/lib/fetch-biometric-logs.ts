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

function parseFunctionError(error: { message?: string; name?: string; context?: unknown }): string {
  const message = error.message || "Could not reach the biometric proxy.";

  if (message.includes("Failed to send a request to the Edge Function")) {
    return "Biometric proxy is not available. Deploy the fetch-biometric-logs edge function to Supabase, then try again.";
  }

  const context = error.context as { body?: string } | undefined;
  if (context?.body) {
    try {
      const parsed = JSON.parse(context.body) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // ignore malformed body
    }
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

  const { data, error } = await supabase.functions.invoke("fetch-biometric-logs", { body });

  if (error) {
    throw new Error(parseFunctionError(error));
  }

  const payload = (data || {}) as FetchBiometricLogsResult;
  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}
