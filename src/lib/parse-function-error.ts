/** Extract a human-readable message from a Supabase Edge Function invoke error. */
export function parseFunctionError(
  error: { message?: string; name?: string; context?: unknown },
  data?: unknown
): string {
  const dataError =
    data && typeof data === "object" && "error" in data
      ? String((data as { error?: unknown }).error ?? "")
      : "";
  if (dataError) return dataError;

  const context = error.context as { body?: string } | undefined;
  if (context?.body) {
    try {
      const parsed = JSON.parse(context.body) as { error?: string; message?: string };
      if (parsed.error) return parsed.error;
      if (parsed.message) return parsed.message;
    } catch {
      // ignore malformed body
    }
  }

  const message = error.message || "The server rejected the request.";
  if (message === "Edge Function returned a non-2xx status code") {
    return "The email service rejected the request. Check Settings → Notifications: save a verified sender address, then try again.";
  }

  return message;
}
