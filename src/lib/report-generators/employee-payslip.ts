import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, isSameWeek } from "date-fns";

export const generateEmployeePayslipReportContent = (
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly" | "weekly",
  auditLevel: "minimal" | "standard" | "detailed" = "standard"
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
    } else if (periodType === "weekly") {
      filteredPayslips = payslips.filter(p => {
        const [startPeriodStr] = p.payPeriod.split(' - ');
        const payslipDate = parseISO(startPeriodStr);
        return isSameWeek(payslipDate, selectedDate, { weekStartsOn: 1 }) && isSameYear(payslipDate, selectedDate);
      });
      reportPeriodDescription = format(selectedDate, "PPP");
    }
  }

  if (filteredPayslips.length === 0) {
    return `<p>No payslip data available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  if (auditLevel === "minimal") {
    const count = filteredPayslips.length;
    const totalNet = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);
    return `
      <p><strong>Report Period:</strong> ${reportPeriodDescription}</p>
      <p><strong>Total Payslips:</strong> ${count}</p>
      <p><strong>Total Net Pay:</strong> R ${totalNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
    `;
  }

  let html = `
    <p>This report provides a list of all generated payslips for ${reportPeriodDescription}. Cash payment-mode employees are excluded from this list for auditing purposes.</p><br/>
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
        <td class="py-2 px-4 text-right">${p.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  if (auditLevel === "detailed") {
    html += `
      <br/>
      <h4 class="text-md font-semibold mb-2">Additional Details</h4>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b">
            <th class="py-2 px-4">Employee</th>
            <th class="py-2 px-4">Pay Date</th>
            <th class="py-2 px-4 text-right">YTD Gross</th>
            <th class="py-2 px-4 text-right">YTD Deductions</th>
          </tr>
        </thead>
        <tbody>
    `;
    filteredPayslips.forEach(p => {
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)} (${p.employeeId})</td>
          <td class="py-2 px-4">${p.payDate}</td>
          <td class="py-2 px-4 text-right">${(p.ytdGrossEarnings || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${(p.ytdTotalDeductions || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
    `;
  }

  return html;
};