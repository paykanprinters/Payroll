import { MockEmployee, MockPayslip } from "../mock-data";
import { getEmployeeName } from "../utils"; // Import from shared utils

export const generateTaxStatutoryReportContent = (payslips: MockPayslip[], employees: MockEmployee[]): string => {
  if (payslips.length === 0) {
    return "<p>No payslip data available to generate this report.</p>";
  }

  const taxDeductionsMap = new Map<string, number>();
  payslips.forEach(p => {
    p.deductionsBreakdown.forEach(d => {
      if (["PAYE", "UIF", "SDL"].includes(d.name)) { // Focus on statutory
        taxDeductionsMap.set(d.name, (taxDeductionsMap.get(d.name) || 0) + d.amount);
      }
    });
  });

  let html = `
    <p>This report summarizes statutory deductions for compliance with SARS.</p>
    <br/>
    <h4 class="text-md font-semibold mb-2">Total Statutory Deductions</h4>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Deduction Type</th>
          <th class="py-2 px-4 text-right">Total Amount (R)</th>
        </tr>
      </thead>
      <tbody>
  `;

  Array.from(taxDeductionsMap.entries()).forEach(([name, amount]) => {
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
    <br/>
    <p class="text-sm text-muted-foreground">
      Note: This is a simplified summary. Actual SARS reports require specific formats and detailed employee-level data.
    </p>
  `;

  return html;
};