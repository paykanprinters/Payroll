import { supabase } from "@/integrations/supabase/client";

export const AUDIT_SEVERITIES = ["info", "change", "warning", "alert", "error", "auth"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_MODULES = [
  "auth",
  "settings",
  "payroll",
  "leave",
  "timesheet",
  "payslip",
  "employee",
  "user",
  "reports",
  "system",
] as const;
export type AuditModule = (typeof AUDIT_MODULES)[number];

export type AuditEntityType =
  | "payroll_run"
  | "payment_batch"
  | "settings"
  | "timesheet"
  | "payslip"
  | "leave_record"
  | "auth"
  | "system"
  | "employee"
  | "user";

export interface AuditEventInput {
  severity: AuditSeverity;
  module: AuditModule | string;
  action: string;
  message: string;
  entityType: AuditEntityType | string;
  entityId: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}

export interface AuditLogRow {
  id: string;
  userId: string | null;
  severity: AuditSeverity;
  module: string;
  action: string;
  message: string | null;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  userName?: string | null;
  userEmail?: string | null;
}

const LOCAL_AUDIT_KEY = "auditEvents";
const ERROR_DEDUPE_MS = 60_000;
const recentErrorKeys = new Map<string, number>();

function appendLocalAudit(event: AuditLogRow) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    const existing = raw ? (JSON.parse(raw) as AuditLogRow[]) : [];
    existing.unshift(event);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(existing.slice(0, 500)));
  } catch {
    // ignore storage failures
  }
}

export function getLocalAuditEvents(): AuditLogRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLogRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function shouldDedupeError(action: string, message: string): boolean {
  const key = `${action}::${message}`;
  const now = Date.now();
  const last = recentErrorKeys.get(key);
  if (last && now - last < ERROR_DEDUPE_MS) return true;
  recentErrorKeys.set(key, now);
  return false;
}

export async function recordAuditEvent(input: AuditEventInput): Promise<boolean> {
  if (input.severity === "error" && shouldDedupeError(input.action, input.message)) {
    return false;
  }

  let userId = input.userId ?? null;
  let userEmail: string | null = null;

  if (userId === undefined) {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
    userEmail = data?.user?.email ?? null;
  }

  const localRow: AuditLogRow = {
    id: crypto.randomUUID?.() || `local-${Date.now()}`,
    userId,
    severity: input.severity,
    module: input.module,
    action: input.action,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
    userEmail,
  };

  appendLocalAudit(localRow);

  const payload = {
    user_id: userId,
    severity: input.severity,
    module: input.module,
    action: input.action,
    message: input.message,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? null,
  };

  const { error } = await supabase.from("audit_logs").insert(payload);
  if (error) {
    console.warn("audit-trail: failed to persist event", error.message);
    return false;
  }
  return true;
}

export async function recordAuthEvent(
  action: "signed_in" | "signed_out",
  details: { userId: string; email?: string; role?: string; portal?: string }
) {
  const verb = action === "signed_in" ? "signed in" : "signed out";
  return recordAuditEvent({
    severity: "auth",
    module: "auth",
    action,
    message: `${details.email || details.userId} ${verb}`,
    entityType: "auth",
    entityId: details.userId,
    userId: details.userId,
    metadata: {
      email: details.email,
      role: details.role,
      portal: details.portal,
    },
  });
}

export async function recordSettingsChange(
  settingsKey: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  return recordAuditEvent({
    severity: "change",
    module: "settings",
    action: "settings_updated",
    message,
    entityType: "settings",
    entityId: settingsKey,
    metadata,
  });
}

export async function recordSystemError(
  message: string,
  metadata?: Record<string, unknown>
) {
  return recordAuditEvent({
    severity: "error",
    module: "system",
    action: "system_error",
    message,
    entityType: "system",
    entityId: "client",
    metadata,
  });
}

export async function recordWarning(
  module: AuditModule | string,
  message: string,
  entityType: AuditEntityType | string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return recordAuditEvent({
    severity: "warning",
    module,
    action: "warning",
    message,
    entityType,
    entityId,
    metadata,
  });
}

export async function recordAlert(
  module: AuditModule | string,
  message: string,
  entityType: AuditEntityType | string,
  entityId: string,
  metadata?: Record<string, unknown>
) {
  return recordAuditEvent({
    severity: "alert",
    module,
    action: "alert",
    message,
    entityType,
    entityId,
    metadata,
  });
}
