/** Human-readable labels for welcome notification edge-function result codes. */
export function describeWelcomeDeliveryResult(code?: string): string {
  if (!code) return "No result";
  const map: Record<string, string> = {
    sent: "Sent successfully",
    disabled: "Template is turned off in Message templates",
    disabled_settings: "Welcome Package is turned off in Settings → Notifications",
    skipped_no_email: "Skipped — employee has no valid email address",
    skipped_no_phone: "Skipped — employee has no valid SA mobile number",
    disabled_channel: "Skipped — SMS is disabled in notification settings",
    failed_not_configured: "Failed — email/SMS provider is not configured on the server",
    failed_no_sender: "Failed — no sender email saved in notification settings",
  };
  if (map[code]) return map[code];
  if (code.startsWith("failed:")) return `Failed — ${code.slice("failed:".length)}`;
  return code;
}

export function formatWelcomeDeliverySummary(results?: Record<string, string>): string {
  if (!results) return "Welcome notification could not be sent.";
  const parts: string[] = [];
  if (results.email) parts.push(`Email: ${describeWelcomeDeliveryResult(results.email)}`);
  if (results.sms) parts.push(`SMS: ${describeWelcomeDeliveryResult(results.sms)}`);
  return parts.join(" · ");
}

export function statusBadgeClass(status: string): string {
  if (status === "sent") return "text-emerald-600";
  if (status === "skipped") return "text-amber-600";
  return "text-destructive";
}
