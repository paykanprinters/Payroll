import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateBenefitDeductionsReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const benefitDeductionsMap = new Map<string, number>();
  payslips.forEach(p => {
    p.deductionsBreakdown.forEach(d => {
      if (!["PAYE", "UIF", "SDL"].includes(d.name)) { // Consider non-statutory as 'benefits' for mock
        benefitDeductionsMap.set(d.name, (benefitDeductionsMap.get(d.name) || 0) + d.amount);
      }
    });
  });

  if (benefitDeductionsMap.size === 0) {
    return "<p>No non-statutory benefit deductions found in payslips to generate this report.</p>";
  }

  let html = `
    <p>This report summarizes non-statutory benefit deductions from employee payslips (mock data).</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Total Benefit Deductions</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Deduction Type</th>
          <th class="py-2 px-4 text-right">Total Amount (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(benefitDeductionsMap.entries()).forEach(([name, amount]) => {
    html += `
      <tr class="border-b">
        <td class="py-2 px-4">${name}</td>
        <td class="py-2 px-4 text-right">${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  return html;
};