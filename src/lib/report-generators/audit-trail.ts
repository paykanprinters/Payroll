import { MockEmployee } from "../mock-data"; // Keep import for consistency, though not directly used here
import { getEmployeeName } from "../utils"; // Keep import for consistency

export const generateAuditTrailReportContent = (): string => {
  const mockAuditEvents = [
    { timestamp: "2024-07-20 10:30:00", user: "Admin User", action: "Updated employee EMP001 salary" },
    { timestamp: "2024-07-19 15:00:00", user: "HR Manager", action: "Approved leave for EMP002" },
    { timestamp: "2024-07-18 09:00:00", user: "Admin User", action: "Generated payslips for July 2024" },
    { timestamp: "2024-07-17 11:45:00", user: "Finance Dept", action: "Added new loan for EMP003" },
    { timestamp: "2024-07-16 14:20:00", user: "Admin User", action: "Updated company details" },
  ];

  let html = `
    <p>This report provides a log of recent system activities (mock data).</p>
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

  mockAuditEvents.forEach(event => {
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