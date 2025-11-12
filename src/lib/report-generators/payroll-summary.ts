import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, isSameWeek } from "date-fns";

export const generatePayrollSummaryReportContent = (
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
        const [startPeriodStr] = p.payPeriod.split(" - ");
        const payslipDate = parseISO(startPeriodStr);
        return isSameWeek(payslipDate, selectedDate, { weekStartsOn: 1 }) && isSameYear(payslipDate, selectedDate);
      });
      reportPeriodDescription = `${format(selectedDate, "PPP")}`;
    }
  }

  if (filteredPayslips.length === 0) {
    return `<p>No payslip data available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  const totalGross = filteredPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
  const totalDeductions = filteredPayslips.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalNet = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);
  const employeeCount = new Set(filteredPayslips.map(p => p.employeeId)).size;

  if (auditLevel === "minimal") {
    return `
      <p><strong>Report Period:</strong> ${reportPeriodDescription}</p>
      <p><strong>Employees Paid (excluding cash):</strong> ${employeeCount}</p>
      <br/>
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
            <td class="py-2 px-4 text-right">${totalGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-4">Total Deductions</td>
            <td class="py-2 px-4 text-right">${totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-4 font-bold">Total Net Pay</td>
            <td class="py-2 px-4 text-right font-bold">${totalNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const uniquePayPeriods = Array.from(new Set(filteredPayslips.map(p => p.payPeriod))).sort();

  let html = `
    <p><strong>Report Period:</strong> ${reportPeriodDescription}</p>
    <p><strong>Employees Paid (excluding cash):</strong> ${employeeCount}</p>
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
          <td class="py-2 px-4 text-right">${totalGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4">Total Deductions</td>
          <td class="py-2 px-4 text-right">${totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4 font-bold">Total Net Pay</td>
          <td class="py-2 px-4 text-right font-bold">${totalNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
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
        <td class="py-2 px-4 text-right">${periodGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${periodDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${periodNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
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
      <h4 class="text-md font-semibold mb-2">Employee-Level Detail</h4>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b">
            <th class="py-2 px-4">Employee</th>
            <th class="py-2 px-4">Pay Period</th>
            <th class="py-2 px-4 text-right">Gross</th>
            <th class="py-2 px-4 text-right">Deductions</th>
            <th class="py-2 px-4 text-right">Net</th>
          </tr>
        </thead>
        <tbody>
    `;
    filteredPayslips.forEach(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${name}</td>
          <td class="py-2 px-4">${p.payPeriod}</td>
          <td class="py-2 px-4 text-right">${p.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${p.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
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