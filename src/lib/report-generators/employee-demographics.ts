import { MockEmployee } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export const generateEmployeeDemographicsReportContent = (
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let filteredEmployees = employees;
  let reportPeriodDescription = "All Periods";

  if (selectedDate) {
    let periodStart: Date;
    let periodEnd: Date;

    if (periodType === "monthly") {
      periodStart = startOfMonth(selectedDate);
      periodEnd = endOfMonth(selectedDate);
      reportPeriodDescription = format(selectedDate, "MMMM yyyy");
    } else { // yearly
      periodStart = startOfYear(selectedDate);
      periodEnd = endOfYear(selectedDate);
      reportPeriodDescription = format(selectedDate, "yyyy");
    }

    // For demographics, we filter employees based on their start date falling within the period
    filteredEmployees = employees.filter(emp => {
      const hireDate = parseISO(emp.startDate);
      return hireDate >= periodStart && hireDate <= periodEnd;
    });
  }

  if (filteredEmployees.length === 0) {
    return `<p>No employee data available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  const jobTitleCounts = new Map<string, number>();
  const salaryRangeCounts = {
    "R0 - R20k": 0,
    "R20k - R40k": 0,
    "R40k - R60k": 0,
    "R60k+": 0,
  };

  filteredEmployees.forEach(emp => {
    jobTitleCounts.set(emp.jobTitle, (jobTitleCounts.get(emp.jobTitle) || 0) + 1);
    if (emp.salary !== undefined) { // Only consider employees with a defined salary
      if (emp.salary <= 20000) salaryRangeCounts["R0 - R20k"]++;
      else if (emp.salary <= 40000) salaryRangeCounts["R20k - R40k"]++;
      else if (emp.salary <= 60000) salaryRangeCounts["R40k - R60k"]++;
      else salaryRangeCounts["R60k+"]++;
    }
  });

  let html = `
    <p>This report provides a demographic overview of your employee base for ${reportPeriodDescription} (mock data).</p>
    <br/>
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
  Array.from(jobTitleCounts.entries()).forEach(([title, count]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${title}</td>
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