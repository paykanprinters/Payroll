import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils
import { format, isSameMonth, isSameYear, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export const generateOvertimeBonusReportContent = (
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

  const overtimeBonusData: { employeeName: string; payPeriod: string; overtime: number; bonus: number }[] = [];

  filteredPayslips.forEach(p => {
    const overtimeEntry = p.earningsBreakdown.find(e => e.name === "Overtime");
    const bonusEntry = p.earningsBreakdown.find(e => e.name === "Bonus"); // Assuming a 'Bonus' entry might exist

    if (overtimeEntry || bonusEntry) {
      overtimeBonusData.push({
        employeeName: getEmployeeName(p.employeeId, employees),
        payPeriod: p.payPeriod,
        overtime: overtimeEntry ? overtimeEntry.amount : 0,
        bonus: bonusEntry ? bonusEntry.amount : 0,
      });
    }
  });

  if (overtimeBonusData.length === 0) {
    return `<p>No overtime or bonus data found in payslips for ${reportPeriodDescription} to generate this report.</p>`;
  }

  let html = `
    <p>This report details overtime hours and bonus payouts for employees for ${reportPeriodDescription}.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Overtime & Bonus Payments</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Employee</th>
          <th class="py-2 px-4">Pay Period</th>
          <th class="py-2 px-4 text-right">Overtime (R)</th>
          <th class="py-2 px-4 text-right">Bonus (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  overtimeBonusData.forEach(data => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${data.employeeName}</td>
        <td class="py-2 px-4">${data.payPeriod}</td>
        <td class="py-2 px-4 text-right">${data.overtime.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
        <td class="py-2 px-4 text-right">${data.bonus.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};