import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import {
  buildEmployeeTaxCertificate,
  getEmployeeTaxCertificateLabel,
  IRP5_SOURCE_CODES,
  type Irp5Certificate,
} from "@/lib/irp5-certificate";
import { filterPayslipsForSarsTaxYear, getSarsTaxYearPeriodLabel } from "@/lib/tax-year-period";
import { mergeEasyFileValidation, type EasyFileValidationReport } from "./easyfile-validation";

/**
 * SARS e@syFile bulk export (COMP-13).
 *
 * Produces a comma-delimited certificate file covering every employee with
 * payslips in a SARS tax year. The layout is a tabular CSV (one row per
 * IRP5/IT3(a) certificate) with identity columns plus SARS source-code columns,
 * which maps onto e@syFile Employer's "Import Payroll File" structure.
 *
 * SARS rule: source-code monetary values are declared in WHOLE RANDS, so amounts
 * are rounded to the nearest rand here. Identity fields are emitted verbatim.
 */

export interface EasyFileColumn {
  key: string;
  header: string;
  /** Source code for the SARS field, where applicable (for documentation/UI). */
  sourceCode?: string;
}

/** Column layout for the e@syFile bulk certificate export. */
export const EASYFILE_COLUMNS: EasyFileColumn[] = [
  { key: "certificateType", header: "Certificate Type" },
  { key: "certificateNumber", header: "Certificate Number" },
  { key: "taxYear", header: "Year of Assessment", sourceCode: "3010" },
  { key: "periodStart", header: "Period Start" },
  { key: "periodEnd", header: "Period End" },
  { key: "payslipCount", header: "Pay Periods" },
  { key: "employerName", header: "Employer Name" },
  { key: "employerPayeRef", header: "PAYE Ref No", sourceCode: "2010" },
  { key: "employerUifRef", header: "UIF Ref No" },
  { key: "employerSdlRef", header: "SDL Ref No" },
  { key: "employeeSurname", header: "Surname", sourceCode: "3010" },
  { key: "employeeFirstNames", header: "First Names" },
  { key: "employeeNumber", header: "Employee Number", sourceCode: "3025" },
  { key: "idNumber", header: "ID Number", sourceCode: "3020" },
  { key: "taxReferenceNumber", header: "Income Tax Ref No", sourceCode: "3015" },
  { key: "uifNumber", header: "UIF Number" },
  { key: "dateOfBirth", header: "Date of Birth", sourceCode: "3080" },
  { key: "startDate", header: "Employment From Date", sourceCode: "3090" },
  { key: "incomeTaxable", header: "Income (Taxable)", sourceCode: IRP5_SOURCE_CODES.REMUNERATION },
  {
    key: "incomeNonTaxable",
    header: "Income (Non-taxable)",
    sourceCode: IRP5_SOURCE_CODES.NON_TAXABLE_INCOME,
  },
  {
    key: "retirementFund",
    header: "Retirement Fund Contributions",
    sourceCode: IRP5_SOURCE_CODES.RETIREMENT_FUND,
  },
  {
    key: "totalDeductions",
    header: "Total Deductions",
    sourceCode: IRP5_SOURCE_CODES.TOTAL_DEDUCTIONS,
  },
  { key: "paye", header: "PAYE", sourceCode: IRP5_SOURCE_CODES.PAYE },
  {
    key: "medicalTaxCredit",
    header: "Medical Scheme Fees Tax Credit",
    sourceCode: IRP5_SOURCE_CODES.MEDICAL_TAX_CREDIT,
  },
  { key: "uif", header: "UIF Contributions", sourceCode: IRP5_SOURCE_CODES.UIF },
];

export interface EasyFileRow {
  employeeId: string;
  certificate: Irp5Certificate;
  values: Record<string, string>;
}

export interface EasyFileSkippedEmployee {
  employeeId: string;
  name: string;
  reason: string;
}

export interface EasyFileExport {
  taxYear: number;
  periodLabel: string;
  rows: EasyFileRow[];
  skipped: EasyFileSkippedEmployee[];
  /** Full pre-submission validation report (certificate + e@syFile schema rules). */
  validation: EasyFileValidationReport;
  /** Aggregate validation errors that would block a clean e@syFile import. */
  hasBlockingErrors: boolean;
  errorCount: number;
  warningCount: number;
}

/** SARS source-code monetary values are declared in whole rands. */
const wholeRand = (amount: number): string => String(Math.round(amount || 0));

const amountForCode = (cert: Irp5Certificate, code: string): number => {
  const all = [...cert.income, ...cert.deductions, ...cert.employerContributions];
  return all.find((l) => l.code === code)?.amount ?? 0;
};

const buildRowValues = (cert: Irp5Certificate): Record<string, string> => ({
  certificateType: getEmployeeTaxCertificateLabel(cert.certificateType),
  certificateNumber: cert.certificateNumber,
  taxYear: String(cert.taxYear),
  periodStart: cert.periodStart,
  periodEnd: cert.periodEnd,
  payslipCount: String(cert.payslipCount),
  employerName: cert.employer.name,
  employerPayeRef: cert.employer.payeReferenceNumber,
  employerUifRef: cert.employer.uifReferenceNumber ?? "",
  employerSdlRef: cert.employer.sdlReferenceNumber ?? "",
  employeeSurname: cert.employee.lastName,
  employeeFirstNames: cert.employee.firstName,
  employeeNumber: cert.employee.customEmployeeId ?? "",
  idNumber: cert.employee.idNumber ?? "",
  taxReferenceNumber: cert.employee.taxReferenceNumber ?? "",
  uifNumber: cert.employee.uifNumber ?? "",
  dateOfBirth: cert.employee.dateOfBirth ?? "",
  startDate: cert.employee.startDate ?? "",
  incomeTaxable: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.REMUNERATION)),
  incomeNonTaxable: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.NON_TAXABLE_INCOME)),
  retirementFund: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.RETIREMENT_FUND)),
  totalDeductions: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.TOTAL_DEDUCTIONS)),
  paye: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.PAYE)),
  medicalTaxCredit: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.MEDICAL_TAX_CREDIT)),
  uif: wholeRand(amountForCode(cert, IRP5_SOURCE_CODES.UIF)),
});

/**
 * Build e@syFile certificate rows for all employees with payslips in the tax year.
 * Employees with no payslips for the year are reported in `skipped`.
 */
export function buildEasyFileExport(
  employees: MockEmployee[],
  allPayslips: MockPayslip[],
  companyDetails: MockCompanyDetails | null,
  taxYear: number
): EasyFileExport {
  const rows: EasyFileRow[] = [];
  const skipped: EasyFileSkippedEmployee[] = [];

  for (const employee of employees) {
    const payslipsForYear = filterPayslipsForSarsTaxYear(allPayslips, taxYear, employee.id);

    if (payslipsForYear.length === 0) {
      skipped.push({
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        reason: "No payslips in this tax year",
      });
      continue;
    }

    const certificate = buildEmployeeTaxCertificate(
      employee,
      payslipsForYear,
      companyDetails,
      taxYear
    );

    rows.push({
      employeeId: employee.id,
      certificate,
      values: buildRowValues(certificate),
    });
  }

  return mergeEasyFileValidation(
    {
      taxYear,
      periodLabel: getSarsTaxYearPeriodLabel(taxYear),
      rows,
      skipped,
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
        errorCount: 0,
        warningCount: 0,
      },
      hasBlockingErrors: false,
      errorCount: 0,
      warningCount: 0,
    },
    companyDetails
  );
}

/** RFC-4180 CSV field escaping (quote when the value contains a comma, quote, or newline). */
export function escapeCsvField(value: string): string {
  const v = value ?? "";
  if (/[",\r\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/** Serialize an e@syFile export to a comma-delimited CSV string (with header row). */
export function serializeEasyFileCsv(exportData: EasyFileExport): string {
  const header = EASYFILE_COLUMNS.map((c) => escapeCsvField(c.header)).join(",");
  const lines = exportData.rows.map((row) =>
    EASYFILE_COLUMNS.map((c) => escapeCsvField(row.values[c.key] ?? "")).join(",")
  );
  return [header, ...lines].join("\r\n");
}

/** Convenience: build + serialize in one call. */
export function generateEasyFileCsv(
  employees: MockEmployee[],
  allPayslips: MockPayslip[],
  companyDetails: MockCompanyDetails | null,
  taxYear: number
): string {
  return serializeEasyFileCsv(buildEasyFileExport(employees, allPayslips, companyDetails, taxYear));
}

/** Suggested filename for the export, e.g. "easyfile-certificates-TY2027.csv". */
export function easyFileExportFilename(taxYear: number): string {
  return `easyfile-certificates-TY${taxYear}.csv`;
}
