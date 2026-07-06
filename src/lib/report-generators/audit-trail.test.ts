import { describe, it, expect } from "vitest";
import { buildAuditTrailReportRows, generateAuditTrailReportContent } from "./audit-trail";

describe("audit trail report", () => {
  it("uses database rows and omits fictional mock events", () => {
    const { rows } = buildAuditTrailReportRows(
      [
        {
          id: "1",
          userId: "u1",
          severity: "info",
          module: "payroll",
          action: "payroll_run_approved",
          message: "Payroll run approved",
          entityType: "payroll_run",
          entityId: "run-1",
          createdAt: "2026-03-15T10:00:00.000Z",
          userName: "Admin User",
        },
      ],
      new Date("2026-03-15"),
      "monthly"
    );

    expect(rows.some((r) => r.action.includes("Payroll run approved"))).toBe(true);
    expect(rows.some((r) => r.user === "HR Manager")).toBe(false);
  });

  it("renders empty state without mock disclaimer", () => {
    const html = generateAuditTrailReportContent(new Date("2026-01-01"), "monthly", []);
    expect(html).toContain("No audit events recorded");
    expect(html).not.toContain("mock data");
  });
});
