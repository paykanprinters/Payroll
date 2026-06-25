import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";

export interface AuditTrailSummary {
  total: number;
  authEvents: number;
  changes: number;
  warnings: number;
  alerts: number;
  errors: number;
  last24h: number;
}

export function buildAuditTrailSummary(rows: AuditLogEntry[]): AuditTrailSummary {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  return rows.reduce<AuditTrailSummary>(
    (acc, row) => {
      acc.total += 1;
      if (row.severity === "auth") acc.authEvents += 1;
      if (row.severity === "change") acc.changes += 1;
      if (row.severity === "warning") acc.warnings += 1;
      if (row.severity === "alert") acc.alerts += 1;
      if (row.severity === "error") acc.errors += 1;
      if (row.createdAt && new Date(row.createdAt).getTime() >= dayAgo) acc.last24h += 1;
      return acc;
    },
    {
      total: 0,
      authEvents: 0,
      changes: 0,
      warnings: 0,
      alerts: 0,
      errors: 0,
      last24h: 0,
    }
  );
}
