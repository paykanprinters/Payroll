import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateBankTransferReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0 || employees.length === 0) {
    return "<p>No payslip or employee data available to generate this report.</p>";
  }

  let html = `
    <p>This report lists net pay amounts and bank details for salary disbursements.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Bank Transfer Details (Net Pay)</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Bank Name</th>
          <th class="py-2 px-4">Account Number</th>
          <th class="py-2 px-4">Branch Code</th>
          <th class="py-2 px-4 text-right">Net Pay (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  payslips.forEach(p => {
    const employee = employees.find(emp => emp.id === p.employeeId);
    if (employee) {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)}</td>
          <td class="py-2 px-4">${employee.bankName || "N/A"}</td>
          <td class="py-2 px-4">${employee.bankAccountNumber || "N/A"}</td>
          <td class="py-2 px-4">${employee.bankBranchCode || "N/A"}</td>
          <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};