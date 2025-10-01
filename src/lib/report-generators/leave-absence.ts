import { MockEmployee, LeaveEntry } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateLeaveAbsenceReportContent = (leaveRecords: LeaveEntry[], employees: MockEmployee[]): string => {
  if (leaveRecords.length === 0) {
    return "<p>No leave records available to generate this report.</p>";
  }

  let html = `
    <p>This report provides an overview of all recorded employee leave and absences.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Leave Records</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Leave Type</th>
          <th class="py-2 px-4">Start Date</th>
          <th class="py-2 px-4">End Date</th>
          <th class="py-2 px-4 text-right">Working Days</th>
        </tr>
      </thead>
      <tbody>
  `;

  leaveRecords.forEach(record => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${getEmployeeName(record.employeeId, employees)}</td>
        <td class="py-2 px-4">${record.leaveType}</td>
        <td class="py-2 px-4">${record.startDate}</td>
        <td class="py-2 px-4">${record.endDate}</td>
        <td class="py-2 px-4 text-right">${record.workingDays}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};