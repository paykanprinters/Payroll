import { format, endOfMonth, endOfYear, parseISO, startOfMonth, startOfYear } from "date-fns";
import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";
import { getAuditEvents } from "@/utils/audit";

export interface AuditTrailReportRow {
  timestamp: string;
  user: string;
  action: string;
  module?: string;
  severity?: string;
}

function formatDbRow(row: AuditLogEntry): AuditTrailReportRow {
  const user = row.userName || row.userEmail || row.userId || "System";
  const action = row.message || row.action;
  return {
    timestamp: row.createdAt || "",
    user,
    action,
    module: row.module,
    severity: row.severity,
  };
}

function formatClientRow(event: { timestamp: string; user: string; action: string }): AuditTrailReportRow {
  return {
    timestamp: event.timestamp,
    user: event.user,
    action: event.action,
    module: "client",
    severity: "info",
  };
}

export function buildAuditTrailReportRows(
  auditLogs: AuditLogEntry[] | undefined,
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): { rows: AuditTrailReportRow[]; periodLabel: string } {
  const clientRows = getAuditEvents().map(formatClientRow);
  const dbRows = (auditLogs || []).map(formatDbRow);

  const merged = [...dbRows, ...clientRows].filter((row) => row.timestamp);

  let periodLabel = "All periods";
  let filtered = merged;

  if (selectedDate) {
    const periodStart = periodType === "monthly" ? startOfMonth(selectedDate) : startOfYear(selectedDate);
    const periodEnd = periodType === "monthly" ? endOfMonth(selectedDate) : endOfYear(selectedDate);
    periodLabel = periodType === "monthly" ? format(selectedDate, "MMMM yyyy") : format(selectedDate, "yyyy");

    filtered = merged.filter((row) => {
      const eventDate = parseISO(row.timestamp);
      return eventDate >= periodStart && eventDate <= periodEnd;
    });
  }

  filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { rows: filtered, periodLabel };
}

export const generateAuditTrailReportContent = (
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly",
  auditLogs?: AuditLogEntry[]
): string => {
  const { rows, periodLabel } = buildAuditTrailReportRows(auditLogs, selectedDate, periodType);

  if (rows.length === 0) {
    return `<p>No audit events recorded for ${periodLabel}. Events appear here after sign-in, settings changes, payroll actions, and other logged activity.</p>`;
  }

  let html = `
    <p>System activity log for <strong>${periodLabel}</strong> (${rows.length} event${rows.length === 1 ? "" : "s"}).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Audit events</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Timestamp</th>
          <th class="py-2 px-4">User</th>
          <th class="py-2 px-4">Module</th>
          <th class="py-2 px-4">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((event) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${event.timestamp}</td>
        <td class="py-2 px-4">${event.user}</td>
        <td class="py-2 px-4">${event.module || "—"}</td>
        <td class="py-2 px-4">${event.action}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};
