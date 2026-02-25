import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths } from "date-fns";
import { MockEmployee } from "../mock-data-interfaces";
import { getEmployeeName } from "../utils"; // Import from shared utils

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
    } else { // yearly
      periodStart = startOfYear(selectedDate);
      periodEnd = endOfYear(selectedDate);
      reportPeriodDescription = format(selectedDate, "yyyy");
    }
  }

  const filteredNewHires = employees.filter(emp => {
    const hireDate = parseISO(emp.startDate);
    if (!periodStart || !periodEnd) return true; // No filter applied
    return hireDate >= periodStart && hireDate <= periodEnd;
  });

  // For terminations, we'd need a 'terminationDate' field, so we'll mock it simply
  const mockTerminations = employees.filter(emp => {
    const mockTerminationDate = addMonths(parseISO(emp.startDate), 12); // Mock termination 1 year after hire
    if (!periodStart || !periodEnd) return false; // Only show terminations if a period is selected
    return mockTerminationDate >= periodStart && mockTerminationDate <= periodEnd && mockTerminationDate < new Date();
  });

  let html = `
    <p>This report summarizes new hires and terminations within ${reportPeriodDescription} (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">New Hires (${reportPeriodDescription})</h4>
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
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No new hires for ${reportPeriodDescription} in mock data.</td></tr>`;
  } else {
    filteredNewHires.forEach(emp => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${emp.firstName} ${emp.lastName}</td>
          <td class="py-2 px-4">${emp.jobTitle}</td>
          <td class="py-2 px-4">${emp.startDate}</td>
        </tr>
      `;
    });
  }
  html += `
      </tbody>
    </table>

    <h4 class="text-md font-semibold mb-2">Terminations (Mock Data for ${reportPeriodDescription})</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee Name</th>
          <th class="py-2 px-4">Job Title</th>
          <th class="py-2 px-4">Mock Termination Date</th>
        </tr>
      </thead>
      <tbody>
  `;
  if (mockTerminations.length === 0) {
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No mock terminations for ${reportPeriodDescription}.</td></tr>`;
  } else {
    mockTerminations.forEach(emp => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${emp.firstName} ${emp.lastName}</td>
          <td class="py-2 px-4">${emp.jobTitle}</td>
          <td class="py-2 px-4">${format(addMonths(parseISO(emp.startDate), 12), 'yyyy-MM-dd')}</td>
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