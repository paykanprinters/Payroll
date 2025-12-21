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

  // Aggregate deduction totals by type/name
  const deductionTotals: Record<string, number> = {};
  filteredPayslips.forEach((p) => {
    (p.deductionsBreakdown || []).forEach((d) => {
      const key = (d?.name || "Unknown").trim();
      const amount = Number(d?.amount || 0);
      deductionTotals[key] = (deductionTotals[key] || 0) + amount;
    });
  });
  const deductionRows = Object.entries(deductionTotals)
    .filter(([, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  // New: Aggregate overtime and public holiday totals from payslip earnings lines (robust matching)
  let overallOvertimePaid = 0;
  let weekendOvertimePaid = 0;
  let publicHolidayPaid = 0;

  filteredPayslips.forEach((p) => {
    (p.earningsBreakdown || []).forEach((e) => {
      const rawName = (e?.name || "");
      const name = rawName.toLowerCase().trim();
      const amount = Number(e?.amount || 0);

      const isPublicHoliday = name.includes("public holiday");
      const isWeekendOvertime =
        name.includes("weekend overtime") ||
        name.includes("(sat") ||
        name.includes("(sun");
      const isAnyOvertime = name.includes("overtime") || isWeekendOvertime;

      if (isPublicHoliday) {
        publicHolidayPaid += amount;
      }
      if (isWeekendOvertime) {
        weekendOvertimePaid += amount;
      }
      if (isAnyOvertime) {
        overallOvertimePaid += amount;
      }
    });
  });

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
  `;

  // Add deductions breakdown by type (e.g., PAYE, UIF, SDL)
  if (deductionRows.length > 0) {
    html += `
      <br/>
      <h4 class="text-md font-semibold mb-2">Deductions Breakdown by Type</h4>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b">
            <th class="py-2 px-4">Deduction Type</th>
            <th class="py-2 px-4 text-right">Amount (R)</th>
          </tr>
        </thead>
        <tbody>
          ${deductionRows.map(([name, amt]) => `
            <tr class="border-b">
              <td class="py-2 px-4">${name}</td>
              <td class="py-2 px-4 text-right">${amt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // Add new Overtime and Public Holiday summary section
  html += `
    <br/>
    <h4 class="text-md font-semibold mb-2">Overtime and Public Holiday Summary</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Metric</th>
          <th class="py-2 px-4 text-right">Amount (R)</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b">
          <td class="py-2 px-4">Overall Overtime Paid</td>
          <td class="py-2 px-4 text-right">${overallOvertimePaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4">Public Holiday Paid</td>
          <td class="py-2 px-4 text-right">${publicHolidayPaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr class="border-b">
          <td class="py-2 px-4">Weekend Overtime</td>
          <td class="py-2 px-4 text-right">${weekendOvertimePaid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  `;

  html += `
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
    const getStart = (period: string) => parseISO(period.split(' - ')[0]);
    html += `
      <br/>
      <h4 class="text-md font-semibold mb-2">Employee-Level Detail</h4>
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
      const emp = employees.find(e => e.id === p.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
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
          <td class="py-2 px-4">${name}</td>
          <td class="py-2 px-4">${p.payPeriod}</td>
          <td class="py-2 px-4 text-right">${uif.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${paye.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${p.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${p.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
          <td class="py-2 px-4 text-right">${dGross != null ? dGross.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
          <td class="py-2 px-4 text-right">${dNet != null ? dNet.toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : '—'}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
      <br/>
      <p class="text-sm text-muted-foreground">
        Notes: Gross includes regular/overtime/weekend premiums; salaried employees are pro-rated for unpaid leave. UIF is capped and excluded from PAYE taxable income. PAYE is annualized per frequency with rebates, then de-annualized.
      </p>
    `;
  }

  return html;
};