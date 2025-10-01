import { format } from "date-fns";
import { MockEmployee } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateNewHiresTerminationsReportContent = (employees: MockEmployee[]): string => {
  if (employees.length === 0) {
    return "<p>No employee data available to generate this report.</p>";
  }

  const newHires = employees.filter(emp => new Date(emp.startDate).getFullYear() === new Date().getFullYear());
  // For terminations, we'd need a 'terminationDate' field, so we'll mock it simply
  const mockTerminations = employees.filter((_, index) => index % 5 === 0 && new Date(employees[index].startDate).getFullYear() < new Date().getFullYear()); // Every 5th old employee is 'terminated'

  let html = `
    <p>This report summarizes new hires and terminations within the current year (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">New Hires (${new Date().getFullYear()})</h4>
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
  if (newHires.length === 0) {
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No new hires this year in mock data.</td></tr>`;
  } else {
    newHires.forEach(emp => {
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

    <h4 class="text-md font-semibold mb-2">Terminations (Mock Data)</h4>
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
    html += `<tr><td colspan="3" class="py-2 px-4 text-center text-muted-foreground">No mock terminations.</td></tr>`;
  } else {
    mockTerminations.forEach(emp => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${emp.firstName} ${emp.lastName}</td>
          <td class="py-2 px-4">${emp.jobTitle}</td>
          <td class="py-2 px-4">${format(new Date(emp.startDate).setMonth(new Date().getMonth() - 1), 'yyyy-MM-dd')}</td>
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