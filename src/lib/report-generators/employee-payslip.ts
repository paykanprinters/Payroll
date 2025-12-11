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
        <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)}</td>
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
    const getStart = (period: string) => parseISO(period.split(' - ')[0]);
    html += `
      <br/>
      <h4 class="text-md font-semibold mb-2">Detailed Deductions & Deltas</h4>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b">
            <th class="py-2 px-4">Employee</th>
            <th class="py-2 px-4">Pay Period</th>
            <th class="py-2 px-4 text-right">UIF</th>
            <th class="py-2 px-4 text-right">PAYE</th>
            <th class="py-2 px-4 text-right">Gross</th>
            <th class="py-2 px-4 text-right">Net</th>
            <th class="py-2 px-4 text-right">Change vs Prev Gross</th>
            <th class="py-2 px-4 text-right">Change vs Prev Net</th>
          </tr>
        </thead>
        <tbody>
    `;
    filteredPayslips.forEach(p => {
      const uif = (p.deductionsBreakdown || []).filter(d => (d?.name || '').trim() === 'UIF').reduce((s, d) => s + (d.amount || 0), 0);
      const paye = (p.deductionsBreakdown || []).filter(d => (d?.name || '').trim() === 'PAYE').reduce((s, d) => s + (d.amount || 0), 0);
      const currentStart = getStart(p.payPeriod);
      const prev = payslips
        .filter(x => x.employeeId === p.employeeId && getStart(x.payPeriod) < currentStart)
        .sort((a, b) => getStart(b.payPeriod).getTime() - getStart(a.payPeriod).getTime())[0];
      const dGross = prev ? (p.grossEarnings || 0) - (prev.grossEarnings || 0) : null;
      const dNet = prev ? (p.netPay || 0) - (prev.netPay || 0) : null;

      html += `
        <tr class="border-b">
          <td class="py-2 px-4">${getEmployeeName(p.employeeId, employees)}</td>
          <td class="py-2 px-4">${p.payPeriod}</td>
          <td class="py-2 px-4 text-right">${uif.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${paye.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${(p.grossEarnings || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${(p.netPay || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${dGross != null ? dGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
          <td class="py-2 px-4 text-right">${dNet != null ? dNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
      <br/>
      <h4 class="text-md font-semibold mb-2">Calculation Notes</h4>
      <ul class="text-sm text-muted-foreground list-disc pl-6 space-y-1">
        <li>Gross comprises regular hours, overtime beyond threshold, and weekend premiums; salaried employees are pro-rated for unpaid leave within the period.</li>
        <li>UIF is charged at the configured rate up to a cap and excluded from PAYE taxable income.</li>
        <li>PAYE is computed on annualized taxable income per pay frequency, rebates applied, then de-annualized to the period.</li>
      </ul>
    `;
  }

  return html;
};