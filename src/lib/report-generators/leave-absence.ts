import { MockEmployee, LeaveEntry } from "../mock-data-interfaces";
import { getEmployeeName } from "../utils"; // Import from shared utils
import {
  format,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from "date-fns";

export const generateLeaveAbsenceReportContent = (
  leaveRecords: LeaveEntry[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let filteredLeaveRecords = leaveRecords;
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

    filteredLeaveRecords = leaveRecords.filter(record => {
      const recordStartDate = parseISO(record.startDate);
      const recordEndDate = parseISO(record.endDate);
      // Check if the leave record's interval overlaps with the selected period
      return isWithinInterval(recordStartDate, { start: periodStart, end: periodEnd }) ||
             isWithinInterval(recordEndDate, { start: periodStart, end: periodEnd }) ||
             (recordStartDate < periodStart && recordEndDate > periodEnd);
    });
  }

  if (filteredLeaveRecords.length === 0) {
    return `<p>No leave records available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  let html = `
    <p>This report provides an overview of all recorded employee leave and absences for ${reportPeriodDescription}.</p>
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

  filteredLeaveRecords.forEach(record => {
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