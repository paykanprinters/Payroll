import { MockEmployee, MockPayslip, MockCompanyDetails } from "../mock-data-interfaces";
import { ReportDesignSettings } from "../report-design-interfaces";
import { format } from "date-fns";

export const generateIrp5ExportContent = (
  employee: MockEmployee,
  payslip: MockPayslip,
  companyDetails: MockCompanyDetails,
  reportDesignSettings: ReportDesignSettings,
): string => {
  const taxYear = payslip.payPeriod.substring(0, 4); // Assuming payPeriod is "YYYY-MM-DD - YYYY-MM-DD"
  const contentFontSize = reportDesignSettings.irp5ContentFontSize || 12; // Use IRP5 specific font size

  const renderField = (label: string, value: string | number | boolean | undefined, code?: string) => {
    const displayValue = (value === undefined || value === null || value === "") ? "N/A" : String(value);
    return `
      <div class="flex justify-between items-center py-1 border-b border-gray-200" style="font-size: ${contentFontSize}px;">
        <span class="font-semibold">${label}</span>
        <span>${displayValue}</span>
        ${code ? `<span class="text-xs text-gray-500 ml-2" style="font-size: ${contentFontSize * 0.8}px;">(${code})</span>` : ''}
      </div>
    `;
  };

  // Mock IRP5 values (simplified)
  const grossIncome = payslip.ytdGrossEarnings;
  const totalDeductions = payslip.ytdTotalDeductions;
  const taxableIncome = grossIncome - totalDeductions; // Very simplified
  const payeDeducted = payslip.deductionsBreakdown.find(d => d.name === "PAYE")?.amount || 0;
  const uifDeducted = payslip.deductionsBreakdown.find(d => d.name === "UIF")?.amount || 0;
  const sdlDeducted = payslip.deductionsBreakdown.find(d => d.name === "SDL")?.amount || 0;

  return `
    <div class="p-8 bg-white text-gray-900 print:text-black" style="font-size: ${contentFontSize}px;">
      <h3 class="font-bold text-center mb-4" style="font-size: ${contentFontSize * 1.5}px;">IRP5 Certificate - Tax Year ${taxYear}</h3>
      <p class="text-center text-muted-foreground mb-6" style="font-size: ${contentFontSize * 0.9}px;">
        (Mock-up for demonstration purposes only. Not a legally compliant SARS document.)
      </p>
      <hr class="my-4 border-gray-300" />

      <div class="space-y-4 mb-6">
        <h4 class="font-semibold underline" style="font-size: ${contentFontSize * 1.1}px;">Employer Details</h4>
        ${renderField("Employer Name", companyDetails.companyLegalName)}
        ${renderField("PAYE Ref No", companyDetails.payeReferenceNumber)}
        ${renderField("UIF Ref No", companyDetails.uifReferenceNumber)}
        ${renderField("SDL Ref No", companyDetails.sdlReferenceNumber)}
        ${renderField("Address", companyDetails.physicalAddress)}
      </div>

      <div class="space-y-4 mb-6">
        <h4 class="font-semibold underline" style="font-size: ${contentFontSize * 1.1}px;">Employee Details</h4>
        ${renderField("Employee Name", `${employee.firstName} ${employee.lastName}`)}
        ${renderField("ID Number", employee.idNumber)}
        ${renderField("Tax Ref No", employee.taxReferenceNumber)}
        ${renderField("Date of Birth", employee.dateOfBirth)}
        ${renderField("Employment Date", employee.startDate)}
      </div>

      <div class="space-y-4 mb-6">
        <h4 class="font-semibold underline" style="font-size: ${contentFontSize * 1.1}px;">Income Details (Year to Date)</h4>
        ${renderField("Gross Remuneration", grossIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "3601")}
        ${renderField("Taxable Income", taxableIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "3601")}
        ${renderField("Total Deductions", totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4001")}
      </div>

      <div class="space-y-4 mb-6">
        <h4 class="font-semibold underline" style="font-size: ${contentFontSize * 1.1}px;">Deductions & Contributions (Year to Date)</h4>
        ${renderField("PAYE Deducted", payeDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4102")}
        ${renderField("UIF Contributions", uifDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4141")}
        ${renderField("SDL Contributions", sdlDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4142")}
        ${payslip.deductionsBreakdown.filter(d => !["PAYE", "UIF", "SDL"].includes(d.name)).map(d =>
          renderField(d.name, d.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4001")
        ).join('')}
      </div>

      <div class="mt-8 text-muted-foreground text-center" style="font-size: ${contentFontSize * 0.9}px;">
        <p>Issued on: ${format(new Date(), "yyyy-MM-dd")}</p>
        <p>This is a system-generated document. No signature is required.</p>
      </div>
    </div>
  `;
};