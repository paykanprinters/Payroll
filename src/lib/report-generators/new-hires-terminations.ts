import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import type { MockEmployee } from "../mock-data-interfaces";
import { getEmploymentStatus } from "@/lib/employment-status";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const generateNewHiresTerminationsReportContent = (
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let reportPeriodDescription = "All Periods";
  let periodStart: Date | undefined;
  let periodEnd: Date | undefined;

  if (selectedDate) {
    if (periodType === "monthly") {
      periodStart = startOfMonth(selectedDate);
      periodEnd = endOfMonth(selectedDate);
      reportPeriodDescription = format(selectedDate, "MMMM yyyy");
    } else {
      periodStart = startOfYear(selectedDate);
      periodEnd = endOfYear(selectedDate);
      reportPeriodDescription = format(selectedDate, "yyyy");
    }
  }

  const filteredNewHires = employees.filter((emp) => {
    if (!emp.startDate) return false;
    const hireDate = parseISO(emp.startDate);
    if (!periodStart || !periodEnd) return true;
    return hireDate >= periodStart && hireDate <= periodEnd;
  });

  const terminations = employees.filter((emp) => {
    if (!emp.terminationDate) return false;
    const terminationDate = parseISO(emp.terminationDate);
    if (!periodStart || !periodEnd) return true;
    return terminationDate >= periodStart && terminationDate <= periodEnd;
  });

  let html = `
    <p>This report summarizes new hires and terminations within ${escapeHtml(reportPeriodDescription)}.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">New Hires (${escapeHtml(reportPeriodDescription)})</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee Name</th>
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4">Start Date</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (filteredNewHires.length === 0) {
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No new hires for ${escapeHtml(reportPeriodDescription)}.</td></tr>`;
  } else {
    filteredNewHires.forEach((emp) => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${escapeHtml(`${emp.firstName} ${emp.lastName}`)}</td>
          <td class="py-2 px-4">${escapeHtml(emp.jobTitle || "—")}</td>
          <td class="py-2 px-4">${escapeHtml(emp.startDate)}</td>
        </tr>
      `;
    });
  }

  html += `
      </tbody>
    </table>

    <h4 class="text-md font-semibold mb-2">Leavers (${escapeHtml(reportPeriodDescription)})</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee Name</th>
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4">Status</th>
          <th class="py-2 px-4">Last day</th>
          <th class="py-2 px-4">Reason</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (terminations.length === 0) {
    html += `<tr><td colspan="5" class="py-2 px-4 text-center text-muted-foreground">No terminations recorded for ${escapeHtml(reportPeriodDescription)}.</td></tr>`;
  } else {
    terminations.forEach((emp) => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${escapeHtml(`${emp.firstName} ${emp.lastName}`)}</td>
          <td class="py-2 px-4">${escapeHtml(emp.jobTitle || "—")}</td>
          <td class="py-2 px-4">${escapeHtml(getEmploymentStatus(emp))}</td>
          <td class="py-2 px-4">${escapeHtml(emp.terminationDate || "—")}</td>
          <td class="py-2 px-4">${escapeHtml(emp.employmentExitReason?.trim() || "—")}</td>
        </tr>
      `;
    });
  }

  html += `
      </tbody>
    </table>
  `;

  return html;
};
