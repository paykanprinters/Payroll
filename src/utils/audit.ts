"use client";

import { logAuditEvent as legacyLogAuditEvent, getAuditEvents } from "@/utils/audit-legacy";
import { recordAuditEvent } from "@/lib/audit-trail";

export type { AuditEvent } from "@/utils/audit-legacy";
export { getAuditEvents };

/** @deprecated Prefer recordAuditEvent from @/lib/audit-trail */
export const logAuditEvent = async (
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) => {
  if (entityType && entityId) {
    await recordAuditEvent({
      severity: "info",
      module: entityType === "settings" ? "settings" : "payroll",
      action,
      message: action,
      entityType,
      entityId,
      metadata,
    });
    return;
  }
  await legacyLogAuditEvent(action, entityType, entityId, metadata);
};
