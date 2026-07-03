import { supabase } from "@/integrations/supabase/client";
import { logger, toLogError } from "@/lib/logger";
import { parseFunctionError } from "@/lib/parse-function-error";
import type { MessageTemplate, MessageTemplateCategory } from "@/lib/message-template-catalog";

function rowToTemplate(row: Record<string, unknown>): MessageTemplate {
  return {
    id: row.id as string,
    templateKey: row.template_key as string,
    channel: row.channel as MessageTemplate["channel"],
    category: row.category as MessageTemplateCategory,
    name: row.name as string,
    description: (row.description as string) ?? null,
    subject: (row.subject as string) ?? null,
    body: row.body as string,
    enabled: !!row.enabled,
    includeLogo: row.include_logo !== false,
    updatedAt: (row.updated_at as string) ?? null,
  };
}

export async function fetchMessageTemplates(): Promise<MessageTemplate[]> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("category")
    .order("channel");

  if (error) {
    logger.error("message-template-queries: fetch failed", toLogError(error));
    return [];
  }
  return (data ?? []).map((row) => rowToTemplate(row as Record<string, unknown>));
}

export async function updateMessageTemplate(
  template: Pick<
    MessageTemplate,
    "id" | "subject" | "body" | "enabled" | "includeLogo"
  >,
  updatedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("message_templates")
    .update({
      subject: template.subject,
      body: template.body,
      enabled: template.enabled,
      include_logo: template.includeLogo,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    })
    .eq("id", template.id);

  if (error) {
    logger.error("message-template-queries: update failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendEmployeeWelcome(employeeId: string): Promise<{
  ok: boolean;
  error?: string;
  results?: Record<string, string>;
}> {
  const { data, error } = await supabase.functions.invoke("send-employee-welcome", {
    body: { employeeId },
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  const result = data as { ok?: boolean; error?: string; results?: Record<string, string> };
  return {
    ok: !!result?.ok,
    error: result?.error,
    results: result?.results,
  };
}
