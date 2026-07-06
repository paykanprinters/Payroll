import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { isValidSaIdNumber, normalizeSaIdNumber } from "@/lib/sa-id-number";
import type { EasyFileExport, EasyFileRow } from "./easyfile-export";
import { EASYFILE_COLUMNS } from "./easyfile-export";

export interface EasyFileValidationIssue {
  code: string;
  field?: string;
  message: string;
  severity: "error" | "warning";
  employeeId?: string;
  employeeName?: string;
}

export interface EasyFileValidationReport {
  isValid: boolean;
  errors: EasyFileValidationIssue[];
  warnings: EasyFileValidationIssue[];
  errorCount: number;
  warningCount: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MONETARY_KEYS = new Set([
  "incomeTaxable",
  "incomeNonTaxable",
  "retirementFund",
  "totalDeductions",
  "paye",
  "medicalTaxCredit",
  "uif",
]);

export function isValidPayeReference(value: string): boolean {
  const cleaned = value.replace(/\s/g, "");
  return /^7\d{9}$/.test(cleaned);
}

export function isValidIncomeTaxReference(value: string): boolean {
  const cleaned = value.replace(/\s/g, "");
  return /^\d{10}$/.test(cleaned);
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isWholeRand(value: string): boolean {
  if (value === "") return true;
  return /^\d+$/.test(value);
}

function employeeLabel(row: EasyFileRow): string {
  return `${row.values.employeeFirstNames} ${row.values.employeeSurname}`.trim();
}

function issue(
  partial: Omit<EasyFileValidationIssue, "severity"> & { severity?: "error" | "warning" }
): EasyFileValidationIssue {
  return { severity: partial.severity ?? "error", ...partial };
}

function validateExportLevel(
  exportData: EasyFileExport,
  companyDetails: MockCompanyDetails | null
): EasyFileValidationIssue[] {
  const issues: EasyFileValidationIssue[] = [];

  if (exportData.rows.length === 0) {
    issues.push(
      issue({
        code: "EXPORT_EMPTY",
        field: "rows",
        message: "No certificate rows to export for this tax year.",
      })
    );
  }

  const payeRef = companyDetails?.payeReferenceNumber?.trim() ?? "";
  if (!payeRef) {
    issues.push(
      issue({
        code: "EMPLOYER_PAYE_MISSING",
        field: "employerPayeRef",
        message: "Employer PAYE reference number is required for e@syFile import.",
      })
    );
  } else if (!isValidPayeReference(payeRef)) {
    issues.push(
      issue({
        code: "EMPLOYER_PAYE_FORMAT",
        field: "employerPayeRef",
        message: `Employer PAYE reference "${payeRef}" must be 10 digits starting with 7.`,
      })
    );
  }

  if (!companyDetails?.companyLegalName?.trim() && !companyDetails?.companyTradingName?.trim()) {
    issues.push(
      issue({
        code: "EMPLOYER_NAME_MISSING",
        field: "employerName",
        message: "Employer legal or trading name is required.",
      })
    );
  }

  const certNumbers = new Map<string, string>();
  const employeeNumbers = new Map<string, string>();
  const idNumbers = new Map<string, string>();

  for (const row of exportData.rows) {
    const name = employeeLabel(row);
    const certNo = row.values.certificateNumber;
    if (certNo) {
      const existing = certNumbers.get(certNo);
      if (existing) {
        issues.push(
          issue({
            code: "DUPLICATE_CERTIFICATE_NUMBER",
            field: "certificateNumber",
            employeeId: row.employeeId,
            employeeName: name,
            message: `Duplicate certificate number "${certNo}" (also used for ${existing}).`,
          })
        );
      } else {
        certNumbers.set(certNo, name);
      }
    }

    const empNo = row.values.employeeNumber?.trim();
    if (empNo) {
      const existing = employeeNumbers.get(empNo);
      if (existing) {
        issues.push(
          issue({
            code: "DUPLICATE_EMPLOYEE_NUMBER",
            field: "employeeNumber",
            employeeId: row.employeeId,
            employeeName: name,
            message: `Duplicate employee number "${empNo}" (also used for ${existing}).`,
          })
        );
      } else {
        employeeNumbers.set(empNo, name);
      }
    }

    const idNo = normalizeSaIdNumber(row.values.idNumber ?? "");
    if (idNo) {
      const existing = idNumbers.get(idNo);
      if (existing) {
        issues.push(
          issue({
            code: "DUPLICATE_ID_NUMBER",
            field: "idNumber",
            employeeId: row.employeeId,
            employeeName: name,
            message: `Duplicate ID number (also used for ${existing}).`,
          })
        );
      } else {
        idNumbers.set(idNo, name);
      }
    }
  }

  return issues;
}

function validateEasyFileRow(row: EasyFileRow, taxYear: number): EasyFileValidationIssue[] {
  const issues: EasyFileValidationIssue[] = [];
  const name = employeeLabel(row);
  const v = row.values;
  const base = { employeeId: row.employeeId, employeeName: name };

  const certType = v.certificateType;
  if (certType !== "IRP5" && certType !== "IT3(a)") {
    issues.push(
      issue({
        ...base,
        code: "CERTIFICATE_TYPE_INVALID",
        field: "certificateType",
        message: `Certificate type must be IRP5 or IT3(a), got "${certType || "(empty)"}".`,
      })
    );
  }

  if (!v.certificateNumber?.trim()) {
    issues.push(
      issue({
        ...base,
        code: "CERTIFICATE_NUMBER_MISSING",
        field: "certificateNumber",
        message: "Certificate number is required.",
      })
    );
  }

  if (v.taxYear !== String(taxYear)) {
    issues.push(
      issue({
        ...base,
        code: "TAX_YEAR_MISMATCH",
        field: "taxYear",
        message: `Row tax year ${v.taxYear} does not match export tax year ${taxYear}.`,
      })
    );
  }

  if (!v.employeeSurname?.trim() || !v.employeeFirstNames?.trim()) {
    issues.push(
      issue({
        ...base,
        code: "EMPLOYEE_NAME_MISSING",
        field: "employeeSurname",
        message: "Employee first names and surname are required.",
      })
    );
  }

  if (!v.employeeNumber?.trim()) {
    issues.push(
      issue({
        ...base,
        code: "EMPLOYEE_NUMBER_MISSING",
        field: "employeeNumber",
        message: "Employee number is required for e@syFile import.",
      })
    );
  }

  const idNumber = v.idNumber?.trim() ?? "";
  const taxRef = v.taxReferenceNumber?.trim() ?? "";
  if (!idNumber && !taxRef) {
    issues.push(
      issue({
        ...base,
        code: "EMPLOYEE_IDENTITY_MISSING",
        field: "idNumber",
        message: "Either a valid ID number or 10-digit income tax reference is required.",
      })
    );
  }

  if (idNumber) {
    if (!isValidSaIdNumber(idNumber)) {
      issues.push(
        issue({
          ...base,
          code: "ID_NUMBER_INVALID",
          field: "idNumber",
          message: "ID number must be 13 digits with a valid checksum and birth date.",
        })
      );
    }
  }

  if (taxRef && !isValidIncomeTaxReference(taxRef)) {
    issues.push(
      issue({
        ...base,
        code: "TAX_REF_FORMAT",
        field: "taxReferenceNumber",
        message: "Income tax reference must be exactly 10 digits.",
      })
    );
  }

  if (!taxRef) {
    issues.push(
      issue({
        ...base,
        code: "TAX_REF_RECOMMENDED",
        field: "taxReferenceNumber",
        message: "Income tax reference is recommended for e@syFile.",
        severity: "warning",
      })
    );
  }

  const employerPaye = v.employerPayeRef?.trim() ?? "";
  if (!employerPaye) {
    issues.push(
      issue({
        ...base,
        code: "ROW_PAYE_REF_MISSING",
        field: "employerPayeRef",
        message: "PAYE reference is missing on the certificate row.",
      })
    );
  } else if (!isValidPayeReference(employerPaye)) {
    issues.push(
      issue({
        ...base,
        code: "ROW_PAYE_REF_FORMAT",
        field: "employerPayeRef",
        message: "PAYE reference must be 10 digits starting with 7.",
      })
    );
  }

  for (const key of ["periodStart", "periodEnd", "startDate"] as const) {
    const val = v[key];
    if (val && !isIsoDate(val)) {
      issues.push(
        issue({
          ...base,
          code: "DATE_FORMAT_INVALID",
          field: key,
          message: `${key} must be YYYY-MM-DD.`,
        })
      );
    }
  }

  if (v.dateOfBirth && !isIsoDate(v.dateOfBirth)) {
    issues.push(
      issue({
        ...base,
        code: "DOB_FORMAT_INVALID",
        field: "dateOfBirth",
        message: "Date of birth must be YYYY-MM-DD.",
      })
    );
  }

  for (const key of MONETARY_KEYS) {
    const val = v[key] ?? "";
    if (!isWholeRand(val)) {
      issues.push(
        issue({
          ...base,
          code: "AMOUNT_NOT_WHOLE_RAND",
          field: key,
          message: `${key} must be a whole number of rands (no decimals).`,
        })
      );
    }
  }

  const paye = Number(v.paye || "0");
  const incomeTaxable = Number(v.incomeTaxable || "0");
  const incomeNonTaxable = Number(v.incomeNonTaxable || "0");

  if (certType === "IRP5") {
    if (paye <= 0) {
      issues.push(
        issue({
          ...base,
          code: "IRP5_PAYE_REQUIRED",
          field: "paye",
          message: "IRP5 certificates must declare PAYE greater than zero.",
          severity: incomeTaxable > 0 ? "error" : "warning",
        })
      );
    }
    if (incomeTaxable <= 0 && incomeNonTaxable <= 0) {
      issues.push(
        issue({
          ...base,
          code: "IRP5_INCOME_MISSING",
          field: "incomeTaxable",
          message: "IRP5 must include taxable remuneration (source code 3601).",
        })
      );
    }
  }

  if (certType === "IT3(a)") {
    if (paye > 0) {
      issues.push(
        issue({
          ...base,
          code: "IT3A_PAYE_FORBIDDEN",
          field: "paye",
          message: "IT3(a) certificates must not declare PAYE — use IRP5 when tax was deducted.",
        })
      );
    }
    if (incomeTaxable > 0) {
      issues.push(
        issue({
          ...base,
          code: "IT3A_TAXABLE_INCOME",
          field: "incomeTaxable",
          message: "IT3(a) should not declare taxable income (3601) — use non-taxable income (3605).",
          severity: "warning",
        })
      );
    }
    if (incomeNonTaxable <= 0 && incomeTaxable <= 0) {
      issues.push(
        issue({
          ...base,
          code: "IT3A_INCOME_MISSING",
          field: "incomeNonTaxable",
          message: "IT3(a) must declare non-taxable remuneration when paid.",
          severity: "warning",
        })
      );
    }
  }

  const certErrors = row.certificate.validation.errors.map((e) =>
    issue({
      ...base,
      code: `CERT_${e.field.replace(/\W+/g, "_").toUpperCase()}`,
      field: e.field,
      message: e.message,
    })
  );
  const certWarnings = row.certificate.validation.warnings.map((w) =>
    issue({
      ...base,
      code: `CERT_${w.field.replace(/\W+/g, "_").toUpperCase()}`,
      field: w.field,
      message: w.message,
      severity: "warning",
    })
  );

  return [...issues, ...certErrors, ...certWarnings];
}

/** Validate CSV row width matches the e@syFile column schema. */
export function validateEasyFileCsvStructure(csv: string): EasyFileValidationIssue[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2) {
    return [
      issue({
        code: "CSV_TOO_SHORT",
        field: "csv",
        message: "CSV must include a header row and at least one data row.",
      }),
    ];
  }

  const expectedCols = EASYFILE_COLUMNS.length;
  const issues: EasyFileValidationIssue[] = [];
  const headerCols = lines[0].split(",").length;

  if (headerCols !== expectedCols) {
    issues.push(
      issue({
        code: "CSV_HEADER_COLUMNS",
        field: "csv",
        message: `CSV header has ${headerCols} columns; expected ${expectedCols}.`,
      })
    );
  }

  lines.slice(1).forEach((line, index) => {
    const colCount = line.split(",").length;
    if (colCount !== expectedCols) {
      issues.push(
        issue({
          code: "CSV_ROW_COLUMNS",
          field: "csv",
          message: `Data row ${index + 1} has ${colCount} columns; expected ${expectedCols}.`,
        })
      );
    }
  });

  return issues;
}

/**
 * Pre-submission validation for a built e@syFile export (SARS import readiness).
 */
export function validateEasyFileExport(
  exportData: EasyFileExport,
  companyDetails: MockCompanyDetails | null
): EasyFileValidationReport {
  const issues = [
    ...validateExportLevel(exportData, companyDetails),
    ...exportData.rows.flatMap((row) => validateEasyFileRow(row, exportData.taxYear)),
  ];

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}

export function mergeEasyFileValidation(
  exportData: EasyFileExport,
  companyDetails: MockCompanyDetails | null
): EasyFileExport {
  const validation = validateEasyFileExport(exportData, companyDetails);
  return {
    ...exportData,
    validation,
    hasBlockingErrors: !validation.isValid,
    errorCount: validation.errorCount,
    warningCount: validation.warningCount,
  };
}
