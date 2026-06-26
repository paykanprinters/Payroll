import { MockEmployee, MockPayslip } from "../mock-data-interfaces";
import { sumEmployerSdl } from "@/lib/sdl";
import {
  filterPayslipsForSarsTaxYear,
  getSarsTaxYearPeriodLabel,
  taxYearFromSelectedDate,
} from "@/lib/tax-year-period";
import { format, isSameMonth, isSameYear, parseISO } from "date-fns";

export const generateTaxStatutoryReportContent = (
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
      const taxYear = taxYearFromSelectedDate(selectedDate);
      filteredPayslips = filterPayslipsForSarsTaxYear(payslips, taxYear);
      reportPeriodDescription = `Tax year ${taxYear} (${getSarsTaxYearPeriodLabel(taxYear)})`;
    }
  }

  if (filteredPayslips.length === 0) {
    return `<p>No payslip data available for ${reportPeriodDescription} to generate this report.</p>`;
  }

  const taxDeductionsMap = new Map<string, number>();
  filteredPayslips.forEach(p => {
    p.deductionsBreakdown.forEach(d => {
      if (["PAYE", "UIF"].includes(d.name)) { // Employee statutory deductions
        taxDeductionsMap.set(d.name, (taxDeductionsMap.get(d.name) || 0) + d.amount);
      }
    });
  });

  // SDL is an employer levy (not deducted from the employee) — report separately.
  const totalEmployerSdl = sumEmployerSdl(filteredPayslips);
  if (totalEmployerSdl > 0) {
    taxDeductionsMap.set("SDL (Employer Contribution)", totalEmployerSdl);
  }

  let html = `
    <p>This report summarizes statutory deductions for compliance with SARS for ${reportPeriodDescription}.</p>
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