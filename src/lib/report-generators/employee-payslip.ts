import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateEmployeePayslipReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  let html = `<p>This report provides a list of all generated payslips. For detailed individual payslips, please use the 'Payslips' section.</p><br/>`;
  html += `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Pay Period</th>
          <th class="py-2 px-4 text-right">Gross Pay</th>
          <th class="py-2 px-4 text-right">Net Pay</th>
        </tr>
      </thead>
      <tbody>
  `;

  payslips.forEach(p => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)} (${p.employeeId})</td>
        <td class="py-2 px-4">${p.payPeriod}</td>
        <td class="py-2 px-4 text-right">${p.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};