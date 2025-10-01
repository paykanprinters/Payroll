import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateOvertimeBonusReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const overtimeBonusData: { employeeName: string; payPeriod: string; overtime: number; bonus: number }[] = [];

  payslips.forEach(p => {
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
    return "<p>No overtime or bonus data found in payslips to generate this report.</p>";
  }

  let html = `
    <p>This report details overtime hours and bonus payouts for employees.</p>
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