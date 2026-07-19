import { format } from "date-fns";
import type { MockCompanyDetails, MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { assessPayrollReadiness, type EmployeeReadinessRow } from "@/lib/payroll-readiness";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusLabel(status: EmployeeReadinessRow["status"]): string {
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  return "Needs attention";
}

function formatIssuesHtml(row: EmployeeReadinessRow): string {
  if (row.issues.length === 0) return "—";
  return row.issues
    .map(
      (issue) =>
        `${issue.severity === "critical" ? "Critical" : "Warning"}: ${escapeHtml(issue.label)}`
    )
    .join("<br/>");
}

export function generatePayrollReadinessReportContent(
  employees: MockEmployee[],
  companyDetails: MockCompanyDetails | null | undefined,
  timesheets: TimesheetEntry[] | undefined,
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string {
  const assessment = assessPayrollReadiness({
    employees,
    companyDetails,
    timesheets,
    selectedDate,
    periodType,
  });

  const generatedAt = format(new Date(), "yyyy-MM-dd HH:mm");
  const { totals } = assessment;
  const outstanding = assessment.employees.filter((row) => row.status !== "ready");
  const ready = assessment.employees.filter((row) => row.status === "ready");

  let html = `
    <p>
      Stakeholder view of payroll readiness for <strong>${escapeHtml(assessment.periodLabel)}</strong>.
      Generated ${escapeHtml(generatedAt)}. Critical items block a clean payroll run; warnings should be cleared before cut-off.
    </p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Executive summary</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Metric</th>
          <th class="py-2 px-4 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b"><td class="py-2 px-4">Employees assessed</td><td class="py-2 px-4 text-right">${totals.employeeCount}</td></tr>
        <tr class="border-b"><td class="py-2 px-4">Ready for payroll</td><td class="py-2 px-4 text-right">${totals.readyCount}</td></tr>
        <tr class="border-b"><td class="py-2 px-4">Blocked (critical gaps)</td><td class="py-2 px-4 text-right">${totals.blockedCount}</td></tr>
        <tr class="border-b"><td class="py-2 px-4">Needs attention (warnings)</td><td class="py-2 px-4 text-right">${totals.attentionCount}</td></tr>
        <tr class="border-b"><td class="py-2 px-4">Critical issues</td><td class="py-2 px-4 text-right">${totals.criticalIssueCount}</td></tr>
        <tr class="border-b"><td class="py-2 px-4">Warning issues</td><td class="py-2 px-4 text-right">${totals.warningIssueCount}</td></tr>
      </tbody>
    </table>
  `;

  html += `
    <h4 class="text-md font-semibold mb-2">Company checklist</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Item</th>
          <th class="py-2 px-4">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (assessment.companyIssues.length === 0) {
    html += `<tr class="border-b"><td class="py-2 px-4">Company tax number</td><td class="py-2 px-4">Ready</td></tr>`;
  } else {
    for (const issue of assessment.companyIssues) {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${escapeHtml(issue.label)}</td>
          <td class="py-2 px-4">${issue.severity === "critical" ? "Critical — missing" : "Warning — missing"}</td>
        </tr>
      `;
    }
  }

  html += `
      </tbody>
    </table>
  `;

  html += `
    <h4 class="text-md font-semibold mb-2">Outstanding employees (${outstanding.length})</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Code</th>
          <th class="py-2 px-4">Department</th>
          <th class="py-2 px-4">Status</th>
          <th class="py-2 px-4">Outstanding items</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (outstanding.length === 0) {
    html += `
      <tr>
        <td colspan="5" class="py-2 px-4 text-center text-muted-foreground">
          No outstanding employee items for ${escapeHtml(assessment.periodLabel)}.
        </td>
      </tr>
    `;
  } else {
    for (const row of outstanding) {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${escapeHtml(row.name)}</td>
          <td class="py-2 px-4">${escapeHtml(row.employeeCode)}</td>
          <td class="py-2 px-4">${escapeHtml(row.department)}</td>
          <td class="py-2 px-4">${statusLabel(row.status)}</td>
          <td class="py-2 px-4">${formatIssuesHtml(row)}</td>
        </tr>
      `;
    }
  }

  html += `
      </tbody>
    </table>
  `;

  html += `
    <h4 class="text-md font-semibold mb-2">Ready employees (${ready.length})</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Code</th>
          <th class="py-2 px-4">Department</th>
          <th class="py-2 px-4">Job title</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (ready.length === 0) {
    html += `
      <tr>
        <td colspan="4" class="py-2 px-4 text-center text-muted-foreground">
          No employees are fully ready yet.
        </td>
      </tr>
    `;
  } else {
    for (const row of ready) {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${escapeHtml(row.name)}</td>
          <td class="py-2 px-4">${escapeHtml(row.employeeCode)}</td>
          <td class="py-2 px-4">${escapeHtml(row.department)}</td>
          <td class="py-2 px-4">${escapeHtml(row.jobTitle)}</td>
        </tr>
      `;
    }
  }

  html += `
      </tbody>
    </table>
  `;

  return html;
}
