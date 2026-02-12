import { MockEmployee } from "../mock-data-interfaces"; // kept for compatibility with existing typings
import { getEmployeeName } from "../utils"; // Keep import for consistency
import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { getAuditEvents } from "@/utils/audit";

export const generateAuditTrailReportContent = (
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  const mockAuditEvents = [
    { timestamp: "2024-07-20 10:30:00", user: "Admin User", action: "Updated employee EMP001 salary" },
    { timestamp: "2024-07-19 15:00:00", user: "HR Manager", action: "Approved leave for EMP002" },
    { timestamp: "2024-07-18 09:00:00", user: "Admin User", action: "Generated payslips for July 2024" },
    { timestamp: "2024-07-17 11:45:00", user: "Finance Dept", action: "Added new loan for EMP003" },
    { timestamp: "2024-07-16 14:20:00", user: "Admin User", action: "Updated company details" },
    { timestamp: "2024-06-25 10:00:00", user: "Admin User", action: "Generated payslips for June 2024" },
    { timestamp: "2023-12-01 08:00:00", user: "Admin User", action: "System startup" },
    { timestamp: "2023-12-15 16:00:00", user: "HR Manager", action: "Reviewed employee performance" },
  ];

  const loggedEvents = getAuditEvents();
  const combinedAuditEvents = [...mockAuditEvents, ...loggedEvents];
  let filteredAuditEvents = combinedAuditEvents;
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

    filteredAuditEvents = mockAuditEvents.filter(event => {
      const eventDate = parseISO(event.timestamp);
      return eventDate >= periodStart && eventDate <= periodEnd;
    });
  }

  if (filteredAuditEvents.length === 0) {
    return `<p>No audit events available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  let html = `
    <p>This report provides a log of system activities for ${reportPeriodDescription} (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Recent Audit Events</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Timestamp</th>
          <th class="py-2 px-4">User</th>
          <th class="py-2 px-4">Action</th>
        </tr>
      </thead>
      <tbody>
  `;

  filteredAuditEvents.forEach(event => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${event.timestamp}</td>
        <td class="py-2 px-4">${event.user}</td>
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