import { MockEmployee, MockPayslip, MockCompanyDetails } from "../mock-data-interfaces";
import { ReportDesignSettings } from "../report-design-interfaces";
import {
  buildEmployeeTaxCertificate,
  formatIrp5Money,
  getEmployeeTaxCertificateLabel,
  type Irp5Certificate,
  type Irp5SourceCodeLine,
} from "@/lib/irp5-certificate";
import { format } from "date-fns";

export const generateIrp5ExportContent = (
  employee: MockEmployee,
  payslipsForYear: MockPayslip[],
  companyDetails: MockCompanyDetails | null,
  reportDesignSettings: ReportDesignSettings,
  selectedYear: number
): string => {
  const cert = buildEmployeeTaxCertificate(employee, payslipsForYear, companyDetails, selectedYear);
  return renderIrp5CertificateHtml(cert, reportDesignSettings.irp5ContentFontSize || 12);
};

/** Shared HTML renderer for IRP5 / IT3(a) certificate model (COMP-11 / COMP-12). */
export function renderIrp5CertificateHtml(
  cert: Irp5Certificate,
  contentFontSize: number = 12
): string {
  const typeLabel = getEmployeeTaxCertificateLabel(cert.certificateType);
  const incomeTotalLabel =
    cert.certificateType === "IT3a"
      ? "Non-taxable income"
      : "Taxable income (after retirement)";
  const incomeTotalAmount =
    cert.certificateType === "IT3a"
      ? cert.totals.nonTaxableIncome
      : cert.totals.taxableIncome;
  const footerNote =
    cert.certificateType === "IT3a"
      ? "IT3(a) is issued when remuneration was paid but no employees' tax (PAYE) was deducted."
      : "SDL is an employer levy and is declared on EMP201 — not on the employee IRP5.";
  const renderField = (label: string, value: string | number | undefined, code?: string) => {
    const displayValue =
      value === undefined || value === null || value === "" ? "N/A" : String(value);
    return `
      <div class="flex justify-between items-baseline" style="font-size: ${contentFontSize}px; line-height: ${contentFontSize * 1.2}px; margin-bottom: ${contentFontSize * 0.1}px;">
        <span class="font-semibold">${label}</span>
        <span class="text-right">${displayValue}</span>
        ${code ? `<span class="text-xs text-gray-500 ml-2" style="font-size: ${contentFontSize * 0.8}px;">(${code})</span>` : ""}
      </div>
    `;
  };

  const renderSourceLines = (lines: Irp5SourceCodeLine[]) =>
    lines
      .map((l) =>
        renderField(l.label, formatIrp5Money(l.amount), l.code)
      )
      .join("");

  const validationBlock =
    cert.validation.errors.length > 0
      ? `<div class="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800" style="font-size: ${contentFontSize * 0.9}px;">
          <p class="font-semibold">Certificate validation errors</p>
          <ul class="list-disc pl-5">${cert.validation.errors.map((e) => `<li>${e.message}</li>`).join("")}</ul>
        </div>`
      : cert.validation.warnings.length > 0
        ? `<div class="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-amber-900" style="font-size: ${contentFontSize * 0.9}px;">
            <p class="font-semibold">Warnings</p>
            <ul class="list-disc pl-5">${cert.validation.warnings.map((w) => `<li>${w.message}</li>`).join("")}</ul>
          </div>`
        : "";

  return `
    <div class="p-8 bg-white text-gray-900 print:text-black" style="font-size: ${contentFontSize}px;">
      <h3 class="text-center font-bold mb-1" style="font-size: ${contentFontSize * 1.3}px;">
        ${typeLabel} Employee Tax Certificate
      </h3>
      <p class="text-center text-muted-foreground mb-1" style="font-size: ${contentFontSize * 0.9}px;">
        Tax year ${cert.taxYear} (${cert.periodLabel})
      </p>
      <p class="text-center text-muted-foreground mb-4" style="font-size: ${contentFontSize * 0.85}px;">
        Certificate no. ${cert.certificateNumber} · ${cert.payslipCount} pay period(s)
      </p>
      ${validationBlock}
      <hr class="my-3 border-gray-300" />

      <div class="space-y-2 mb-4">
        <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Employer Details</h4>
        ${renderField("Employer Name", cert.employer.name)}
        ${renderField("PAYE Ref No", cert.employer.payeReferenceNumber)}
        ${renderField("UIF Ref No", cert.employer.uifReferenceNumber)}
        ${renderField("SDL Ref No", cert.employer.sdlReferenceNumber)}
        ${renderField("Tax Number", cert.employer.taxNumber)}
        ${renderField("Address", cert.employer.address)}
      </div>

      <div class="space-y-2 mb-4">
        <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Employee Details</h4>
        ${renderField("Employee Name", cert.employee.fullName)}
        ${renderField("Employee No", cert.employee.customEmployeeId)}
        ${renderField("ID Number", cert.employee.idNumber)}
        ${renderField("Tax Ref No", cert.employee.taxReferenceNumber)}
        ${renderField("UIF No", cert.employee.uifNumber)}
        ${renderField("Date of Birth", cert.employee.dateOfBirth)}
        ${renderField("Employment Date", cert.employee.startDate)}
      </div>

      <div class="grid grid-cols-2 gap-x-8 mb-4">
        <div>
          <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Income (source codes)</h4>
          ${renderSourceLines(cert.income)}
          ${renderField(incomeTotalLabel, formatIrp5Money(incomeTotalAmount))}
        </div>
        <div>
          <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Deductions & credits</h4>
          ${renderSourceLines(cert.deductions)}
        </div>
      </div>

      ${
        cert.employerContributions.length > 0
          ? `<div class="mb-4">
          <h4 class="font-semibold underline mb-2" style="font-size: ${contentFontSize * 1.1}px;">Employer contributions</h4>
          ${renderSourceLines(cert.employerContributions)}
        </div>`
          : ""
      }

      <div class="mt-6 text-muted-foreground text-center" style="font-size: ${contentFontSize * 0.9}px;">
        <p>Issued on: ${format(new Date(cert.issuedDate), "yyyy-MM-dd")}</p>
        <p>${footerNote}</p>
        <p>Verify against SARS eFiling / e@syFile before submission.</p>
      </div>
    </div>
  `;
}
