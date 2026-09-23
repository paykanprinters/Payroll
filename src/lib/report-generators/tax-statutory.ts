import { MockEmployee, MockPayslip } from "../mock-data-interfaces";
import { sumEmployerSdl } from "@/lib/sdl";
import {
  filterPayslipsForSarsTaxYear,
  getSarsTaxYearPeriodLabel,
  taxYearFromSelectedDate,
} from "@/lib/tax-year-period";
import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import { shouldTrackEmployeeTax } from "@/lib/employee-tax-tracking";

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

  const byId = new Map(employees.map((e) => [e.id, e]));
  // Include cash-paid track-tax employees in totals; omit those who opted out.
  filteredPayslips = filteredPayslips.filter((p) =>
    shouldTrackEmployeeTax(byId.get(p.employeeId))
  );

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

  const cashTrackedCount = filteredPayslips.filter((p) => {
    const emp = byId.get(p.employeeId);
    return emp?.paymentMode === "Cash";
  }).length;

  let html = `
    <p>This report summarizes statutory deductions for compliance with SARS for ${reportPeriodDescription}.</p>
    <p class="text-sm text-muted-foreground">
      Totals include all employees with tax tracking enabled. Cash-paid employees are not listed individually
      on cash-excluded payroll reports, but their PAYE/UIF still count here${cashTrackedCount > 0 ? ` (${cashTrackedCount} cash payslip(s) in this period)` : ""}.
    </p>
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