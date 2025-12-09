import { MockEmployee, MockPayslip, MockCompanyDetails } from "../mock-data-interfaces";
import { ReportDesignSettings } from "../report-design-interfaces";
import { format } from "date-fns";

export const generateIrp5ExportContent = (
  employee: MockEmployee,
  payslipsForYear: MockPayslip[], // Changed from single payslip to array of payslips for the year
  companyDetails: MockCompanyDetails | null, // Now accepts null
  reportDesignSettings: ReportDesignSettings,
  selectedYear: number, // Added selectedYear for clarity
): string => {
  const contentFontSize = reportDesignSettings.irp5ContentFontSize || 12; // Use IRP5 specific font size

  const renderField = (label: string, value: string | number | boolean | undefined, code?: string) => {
    const escape = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const rawValue = (value === undefined || value === null || value === "") ? "N/A" : String(value);
    const displayValue = escape(rawValue);
    const safeLabel = escape(String(label));
    const safeCode = code ? escape(code) : undefined;
    return `
      <div class="flex justify-between items-baseline" style="font-size: ${contentFontSize}px; line-height: ${contentFontSize * 1.2}px; margin-bottom: ${contentFontSize * 0.1}px;">
        <span class="font-semibold">${safeLabel}</span>
        <span class="text-right">${displayValue}</span>
        ${safeCode ? `<span class="text-xs text-gray-500 ml-2" style="font-size: ${contentFontSize * 0.8}px;">(${safeCode})</span>` : ''}
      </div>
    `;
  };

  // Aggregate values from all payslips for the selected year
  const totalGrossIncome = payslipsForYear.reduce((sum, p) => sum + p.grossEarnings, 0);
  const totalDeductions = payslipsForYear.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalPayeDeducted = payslipsForYear.reduce((sum, p) => sum + (p.deductionsBreakdown.find(d => d.name === "PAYE")?.amount || 0), 0);
  const totalUifDeducted = payslipsForYear.reduce((sum, p) => sum + (p.deductionsBreakdown.find(d => d.name === "UIF")?.amount || 0), 0);
  const totalSdlDeducted = payslipsForYear.reduce((sum, p) => sum + (p.deductionsBreakdown.find(d => d.name === "SDL")?.amount || 0), 0);

  // Collect all other deductions
  const otherDeductionsMap = new Map<string, number>();
  payslipsForYear.forEach(p => {
    p.deductionsBreakdown.forEach(d => {
      if (!["PAYE", "UIF", "SDL"].includes(d.name)) {
        otherDeductionsMap.set(d.name, (otherDeductionsMap.get(d.name) || 0) + d.amount);
      }
    });
  });

  const taxableIncome = totalGrossIncome - totalDeductions; // Very simplified

  return `
    <div class="p-8 bg-white text-gray-900 print:text-black" style="font-size: ${contentFontSize}px;">
      <p class="text-center text-muted-foreground mb-4" style="font-size: ${contentFontSize * 0.9}px;">
        (Mock-up for demonstration purposes only. Not a legally compliant SARS document.)
      </p>
      <hr class="my-3 border-gray-300" style="margin-top: ${contentFontSize * 0.8}px; margin-bottom: ${contentFontSize * 0.8}px;" />

      <div class="space-y-2 mb-4">
        <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Employer Details</h4>
        ${renderField("Employer Name", companyDetails?.companyLegalName)}
        ${renderField("PAYE Ref No", companyDetails?.payeReferenceNumber)}
        ${renderField("UIF Ref No", companyDetails?.uifReferenceNumber)}
        ${renderField("SDL Ref No", companyDetails?.sdlReferenceNumber)}
        ${renderField("Address", companyDetails?.physicalAddress)}
      </div>

      <div class="space-y-2 mb-4">
        <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Employee Details</h4>
        ${renderField("Employee Name", `${employee.firstName} ${employee.lastName}`)}
        ${renderField("ID Number", employee.idNumber)}
        ${renderField("Tax Ref No", employee.taxReferenceNumber)}
        ${renderField("Date of Birth", employee.dateOfBirth)}
        ${renderField("Employment Date", employee.startDate)}
      </div>

      <div class="grid grid-cols-2 gap-x-8 mb-4">
        <div>
          <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Income Details (Year to Date)</h4>
          ${renderField("Gross Remuneration", totalGrossIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "3601")}
          ${renderField("Taxable Income", taxableIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "3601")}
          ${renderField("Total Deductions", totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4001")}
        </div>
        <div>
          <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Deductions & Contributions (Year to Date)</h4>
          ${renderField("PAYE Deducted", totalPayeDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4102")}
          ${renderField("UIF Contributions", totalUifDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4141")}
          ${renderField("SDL Contributions", totalSdlDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4142")}
          ${Array.from(otherDeductionsMap.entries()).map(([name, amount]) =>
            renderField(name, amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4001")
          ).join('')}
        </div>
      </div>

      <div class="mt-6 text-muted-foreground text-center" style="font-size: ${contentFontSize * 0.9}px;">
        <p>Issued on: ${format(new Date(), "yyyy-MM-dd")}</p>
        <p>This is a system-generated document. No signature is required.</p>
      </div>
    </div>
  `;
};