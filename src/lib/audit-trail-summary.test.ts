import { describe, it, expect } from "vitest";
import { buildAuditTrailSummary } from "@/lib/audit-trail-summary";
import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";

const base = (overrides: Partial<AuditLogEntry>): AuditLogEntry => ({
  id: "1",
  userId: "u1",
  severity: "info",
  module: "system",
  action: "test",
  message: "Test",
  entityType: "system",
  entityId: "x",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("buildAuditTrailSummary", () => {
  it("counts severities", () => {
    const summary = buildAuditTrailSummary([
      base({ severity: "auth" }),
      base({ severity: "change" }),
      base({ severity: "error" }),
      base({ severity: "warning" }),
      base({ severity: "alert" }),
    ]);

    expect(summary.total).toBe(5);
    expect(summary.authEvents).toBe(1);
    expect(summary.changes).toBe(1);
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.alerts).toBe(1);
  });
});
