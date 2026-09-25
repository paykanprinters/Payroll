import { format, endOfMonth, endOfYear } from "date-fns";
import type { MockEmployee } from "../mock-data-interfaces";
import { isEmployedAt } from "@/lib/employee-active-period";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const generateEmployeeDemographicsReportContent = (
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let filteredEmployees = employees;
  let reportPeriodDescription = "All Periods";
  let periodEnd: Date | undefined;

  if (selectedDate) {
    if (periodType === "monthly") {
      periodEnd = endOfMonth(selectedDate);
      reportPeriodDescription = format(selectedDate, "MMMM yyyy");
    } else {
      periodEnd = endOfYear(selectedDate);
      reportPeriodDescription = format(selectedDate, "yyyy");
    }

    filteredEmployees = employees.filter((emp) =>
      isEmployedAt(emp, periodEnd ?? new Date())
    );
  } else {
    filteredEmployees = employees.filter((emp) => isEmployedAt(emp, new Date()));
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
      (${filteredEmployees.length} employee${filteredEmployees.length === 1 ? "" : "s"} still employed
      at the end of the period). Resigned and terminated employees are excluded once their last day has passed.
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
