import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName, formatCurrency } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export const generateEmployeePayslipReportContent = (
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): string => {
  let filteredPayslips = payslips;
  let reportPeriodDescription = "All Periods";

  if (selectedDate) {
    if (periodType === "monthly") {
      filteredPayslips = payslips.filter(p => {
        const [startPeriodStr] = p.payPeriod.split(' - ');
        const payslipDate = parseISO(startPeriodStr);
        return isSameMonth(payslipDate, selectedDate) && isSameYear(payslipDate, selectedDate);
      });
      reportPeriodDescription = format(selectedDate, "MMMM yyyy");
    } else if (periodType === "yearly") {
      filteredPayslips = payslips.filter(p => {
        const [startPeriodStr] = p.payPeriod.split(' - ');
        const payslipDate = parseISO(startPeriodStr);
        return isSameYear(payslipDate, selectedDate);
      });
      reportPeriodDescription = format(selectedDate, "yyyy");
    }
  }

  if (filteredPayslips.length === 0) {
    return `<p>No payslip data available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  let html = `<p>This report provides a list of all generated payslips for ${reportPeriodDescription}. For detailed individual payslips, please use the 'Payslips' section.</p><br/>`;
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

  filteredPayslips.forEach(p => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)} (${p.employeeId})</td>
        <td class="py-2 px-4">${p.payPeriod}</td>
        <td class="py-2 px-4 text-right">R ${formatCurrency(p.grossEarnings)}</td>
        <td class="py-2 px-4 text-right">R ${formatCurrency(p.netPay)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};