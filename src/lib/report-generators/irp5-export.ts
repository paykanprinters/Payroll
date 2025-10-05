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

  const renderField = (label: string, value: string | number | boolean | undefined, code?: string) => {
    const displayValue = (value === undefined || value === null || value === "") ? "N/A" : String(value);
    return `
      <div class="flex justify-between items-center py-1 border-b border-gray-200">
        <span class="font-semibold text-sm">${label}</span>
        <span class="text-sm">${displayValue}</span>
        ${code ? `<span class="text-xs text-gray-500 ml-2">(${code})</span>` : ''}
      </div>
    `;
  };

  const companyLogoHtml =
    reportDesignSettings.includeCompanyLogo && companyDetails.logoUrl
      ? `<img src="${companyDetails.logoUrl}" alt="Company Logo" style="width: ${companyDetails.logoSize}px; height: ${companyDetails.logoSize}px; object-fit: contain;" class="rounded-md flex-shrink-0" />`
      : "";

  const companyDetailsHtml = reportDesignSettings.includeCompanyDetails
    ? `
    <div class="text-right text-xs">
      <h2 class="text-md font-bold">${companyDetails.companyLegalName || "Your Company Legal Name"}</h2>
      ${companyDetails.companyTradingName && companyDetails.companyTradingName !== companyDetails.companyLegalName ? `<p class="text-sm">${companyDetails.companyTradingName}</p>` : ""}
      <p>${companyDetails.physicalAddress || "N/A"}</p>
      <p>Reg. No: ${companyDetails.companyRegistrationNumber || "N/A"}</p>
      <p>VAT No: ${companyDetails.vatRegistrationNumber || "N/A"}</p>
      <p>Tel: ${companyDetails.mainContactNumber || "N/A"}</p>
      <p>Email: ${companyDetails.companyEmail || "N/A"}</p>
      <p>Web: ${companyDetails.companyWebsite || "N/A"}</p>
    </div>
  `
    : "";

  // Mock IRP5 values (simplified)
  const grossIncome = payslip.ytdGrossEarnings;
  const totalDeductions = payslip.ytdTotalDeductions;
  const taxableIncome = grossIncome - totalDeductions; // Very simplified
  const payeDeducted = payslip.deductionsBreakdown.find(d => d.name === "PAYE")?.amount || 0;
  const uifDeducted = payslip.deductionsBreakdown.find(d => d.name === "UIF")?.amount || 0;
  const sdlDeducted = payslip.deductionsBreakdown.find(d => d.name === "SDL")?.amount || 0;

  return `
    <div class="p-8 bg-white text-gray-900 print:text-black">
      <div class="flex justify-between items-start mb-6">
        ${companyLogoHtml}
        ${companyDetailsHtml}
      </div>
      <hr class="my-4 border-gray-300" />
      <h3 class="text-xl font-bold text-center mb-4">IRP5 Certificate - Tax Year ${taxYear}</h3>
      <p class="text-center text-sm text-muted-foreground mb-6">
        (Mock-up for demonstration purposes only. Not a legally compliant SARS document.)
      </p>
      <hr class="my-4 border-gray-300" />

      <div class="space-y-4 mb-6">
        <h4 class="text-lg font-semibold underline">Employer Details</h4>
        ${renderField("Employer Name", companyDetails.companyLegalName)}
        ${renderField("PAYE Ref No", companyDetails.payeReferenceNumber)}
        ${renderField("UIF Ref No", companyDetails.uifReferenceNumber)}
        ${renderField("SDL Ref No", companyDetails.sdlReferenceNumber)}
        ${renderField("Address", companyDetails.physicalAddress)}
      </div>

      <div class="space-y-4 mb-6">
        <h4 class="text-lg font-semibold underline">Employee Details</h4>
        ${renderField("Employee Name", `${employee.firstName} ${employee.lastName}`)}
        ${renderField("ID Number", employee.idNumber)}
        ${renderField("Tax Ref No", employee.taxReferenceNumber)}
        ${renderField("Date of Birth", employee.dateOfBirth)}
        ${renderField("Employment Date", employee.startDate)}
      </div>

      <div class="space-y-4 mb-6">
        <h4 class="text-lg font-semibold underline">Income Details (Year to Date)</h4>
        ${renderField("Gross Remuneration", grossIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "3601")}
        ${renderField("Taxable Income", taxableIncome.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "3601")}
        ${renderField("Total Deductions", totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4001")}
      </div>

      <div class="space-y-4 mb-6">
        <h4 class="text-lg font-semibold underline">Deductions & Contributions (Year to Date)</h4>
        ${renderField("PAYE Deducted", payeDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4102")}
        ${renderField("UIF Contributions", uifDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4141")}
        ${renderField("SDL Contributions", sdlDeducted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4142")}
        ${payslip.deductionsBreakdown.filter(d => !["PAYE", "UIF", "SDL"].includes(d.name)).map(d =>
          renderField(d.name, d.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 }), "4001")
        ).join('')}
      </div>

      <div class="mt-8 text-sm text-muted-foreground text-center">
        <p>Issued on: ${format(new Date(), "yyyy-MM-dd")}</p>
        <p>This is a system-generated document. No signature is required.</p>
      </div>
    </div>
  `;
};