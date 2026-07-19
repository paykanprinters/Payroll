import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import type { MockEmployee } from "../mock-data-interfaces";

type EmployeeWithOptionalTermination = MockEmployee & { terminationDate?: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Active workforce as of the period end (hired on/before end; not terminated before start). */
function isActiveInPeriod(
  emp: EmployeeWithOptionalTermination,
  periodStart: Date | undefined,
  periodEnd: Date | undefined
): boolean {
  if (!emp.startDate) return false;
  const hireDate = parseISO(emp.startDate);
  if (periodEnd && hireDate > periodEnd) return false;

  if (emp.terminationDate) {
    const terminationDate = parseISO(emp.terminationDate);
    if (periodStart && terminationDate < periodStart) return false;
  }

  return true;
}

export const generateEmployeeDemographicsReportContent = (
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let filteredEmployees = employees as EmployeeWithOptionalTermination[];
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

    filteredEmployees = (employees as EmployeeWithOptionalTermination[]).filter((emp) =>
      isActiveInPeriod(emp, periodStart, periodEnd)
    );
  }

  if (filteredEmployees.length === 0) {
    return `<p>No employee data available for ${escapeHtml(reportPeriodDescription)} to generate this report.</p>`;
  }

  const jobTitleCounts = new Map<string, number>();
  const departmentCounts = new Map<string, number>();
  const salaryRangeCounts = {
    "R0 - R20k": 0,
    "R20k - R40k": 0,
    "R40k - R60k": 0,
    "R60k+": 0,
  };

  filteredEmployees.forEach((emp) => {
    const title = emp.jobTitle?.trim() || "Unspecified";
    const department = emp.department?.trim() || "Unspecified";
    jobTitleCounts.set(title, (jobTitleCounts.get(title) || 0) + 1);
    departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);
    if (emp.salary !== undefined) {
      if (emp.salary <= 20000) salaryRangeCounts["R0 - R20k"]++;
      else if (emp.salary <= 40000) salaryRangeCounts["R20k - R40k"]++;
      else if (emp.salary <= 60000) salaryRangeCounts["R40k - R60k"]++;
      else salaryRangeCounts["R60k+"]++;
    }
  });

  let html = `
    <p>
      Demographic overview of the active workforce for ${escapeHtml(reportPeriodDescription)}
      (${filteredEmployees.length} employee${filteredEmployees.length === 1 ? "" : "s"}).
    </p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Employees by Department</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Department</th>
          <th class="py-2 px-4 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(departmentCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([department, count]) => {
      html += `
      <tr class="border-b">
        <td class="py-2 px-4">${escapeHtml(department)}</td>
        <td class="py-2 px-4 text-right">${count}</td>
      </tr>
    `;
    });

  html += `
      </tbody>
    </table>

    <h4 class="text-md font-semibold mb-2">Employees by Job Title</h4>
    <table class="w-full text-left border-collapse mb-6">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(jobTitleCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([title, count]) => {
      html += `
      <tr class="border-b">
        <td class="py-2 px-4">${escapeHtml(title)}</td>
        <td class="py-2 px-4 text-right">${count}</td>
      </tr>
    `;
    });

  html += `
      </tbody>
    </table>

    <h4 class="text-md font-semibold mb-2">Employees by Salary Range</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Salary Range</th>
          <th class="py-2 px-4 text-right">Count</th>
        </tr>
      </thead>
      <tbody>
  `;

  Object.entries(salaryRangeCounts).forEach(([range, count]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${range}</td>
        <td class="py-2 px-4 text-right">${count}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};
