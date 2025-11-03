import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName, formatCurrency } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export const generatePayrollSummaryReportContent = (
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

  const totalGross = filteredPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
  const totalDeductions = filteredPayslips.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalNet = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);

  const uniquePayPeriods = Array.from(new Set(filteredPayslips.map(p => p.payPeriod))).sort();

  let html = `
    <p><strong>Report Period:</strong> ${reportPeriodDescription}</p>
    <p><strong>Total Employees Paid:</strong> ${new Set(filteredPayslips.map(p => p.employeeId)).size}</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Overall Summary</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Metric</th>
          <th class="py-2 px-4 text-right">Amount (R)</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b">
          <td class="py-2 px-4">Total Gross Earnings</td>
          <td class="py-2 px-4 text-right">${formatCurrency(totalGross)}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4">Total Deductions</td>
          <td class="py-2 px-4 text-right">${formatCurrency(totalDeductions)}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4 font-bold">Total Net Pay</td>
          <td class="py-2 px-4 text-right font-bold">${formatCurrency(totalNet)}</td>
        </tr>
      </tbody>
    </table>
    <br/>
    <h4 class="text-md font-semibold mb-2">Summary by Pay Period</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Pay Period</th>
          <th class="py-2 px-4 text-right">Gross Pay</th>
          <th class="py-2 px-4 text-right">Deductions</th>
          <th class="py-2 px-4 text-right">Net Pay</th>
        </tr>
      </thead>
      <tbody>
  `;

  uniquePayPeriods.forEach(period => {
    const periodPayslips = filteredPayslips.filter(p => p.payPeriod === period);
    const periodGross = periodPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
    const periodDeductions = periodPayslips.reduce((sum, p) => sum + p.totalDeductions, 0);
    const periodNet = periodPayslips.reduce((sum, p) => sum + p.netPay, 0);
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${period}</td>
        <td class="py-2 px-4 text-right">${formatCurrency(periodGross)}</td>
        <td class="py-2 px-4 text-right">${formatCurrency(periodDeductions)}</td>
        <td class="py-2 px-4 text-right">${formatCurrency(periodNet)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};