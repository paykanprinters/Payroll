import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import {
  computeMonthlyMedicalTaxCredit,
  getSarsMedicalTaxCredits,
} from "@/lib/sars-tax-tables";
import { getSarsTaxYearBounds, getSarsTaxYearPeriodLabel } from "@/lib/tax-year-period";
import { bankersRound } from "@/lib/utils";

/**
 * SARS IRP5 / IT3(a) certificate model (COMP-11, COMP-12).
 *
 * Aggregates year-to-date payslip data into the source-code lines employers
 * declare on employee tax certificates. SDL is an employer levy and is
 * excluded from the employee certificate (declared on EMP201 instead).
 *
 * Source codes follow the SARS Guide for Employers (PAYE-GEN-01-G21).
 * @see https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/
 */
export const IRP5_SOURCE_CODES = {
  /** Taxable remuneration (income). */
  REMUNERATION: "3601",
  /** Non-taxable income. */
  NON_TAXABLE_INCOME: "3605",
  /** Medical aid contributions (employer-paid fringe benefit income). */
  MEDICAL_AID_FRINGE: "3810",
  /** Total deductions from remuneration. */
  TOTAL_DEDUCTIONS: "4001",
  /** Retirement annuity / pension / provident fund contributions (employee). */
  RETIREMENT_FUND: "4003",
  /** Employees' tax (PAYE) deducted. */
  PAYE: "4102",
  /** Medical scheme fees tax credit (Section 6A). */
  MEDICAL_TAX_CREDIT: "4116",
  /** UIF contributions (employee portion). */
  UIF: "4141",
  /** Employer contributions to medical aid schemes. */
  EMPLOYER_MEDICAL_AID: "4474",
} as const;

export type Irp5SourceCode = (typeof IRP5_SOURCE_CODES)[keyof typeof IRP5_SOURCE_CODES];

export interface Irp5SourceCodeLine {
  code: Irp5SourceCode | string;
  label: string;
  amount: number;
}

export interface Irp5ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export type EmployeeTaxCertificateType = "IRP5" | "IT3a";

export interface Irp5Certificate {
  certificateNumber: string;
  certificateType: EmployeeTaxCertificateType;
  taxYear: number;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  issuedDate: string;
  payslipCount: number;

  employer: {
    name: string;
    payeReferenceNumber: string;
    uifReferenceNumber?: string;
    sdlReferenceNumber?: string;
    taxNumber?: string;
    address?: string;
  };

  employee: {
    firstName: string;
    lastName: string;
    fullName: string;
    customEmployeeId?: string;
    idNumber?: string;
    taxReferenceNumber?: string;
    uifNumber?: string;
    dateOfBirth?: string;
    startDate?: string;
  };

  /** Income section (source codes 36xx). */
  income: Irp5SourceCodeLine[];
  /** Deductions & credits section (source codes 40xx / 41xx). */
  deductions: Irp5SourceCodeLine[];
  /** Employer contribution lines (44xx) — informational on the certificate. */
  employerContributions: Irp5SourceCodeLine[];

  /** Derived totals for display and EMP501 prep (COMP-14). */
  totals: {
    grossRemuneration: number;
    retirementFundContributions: number;
    taxableIncome: number;
    payeDeducted: number;
    uifContributions: number;
    medicalTaxCredit: number;
    nonTaxableIncome: number;
  };

  validation: {
    isValid: boolean;
    errors: Irp5ValidationIssue[];
    warnings: Irp5ValidationIssue[];
  };
}

const sumDeduction = (payslips: MockPayslip[], name: string): number =>
  payslips.reduce(
    (sum, p) =>
      sum + (p.deductionsBreakdown?.find((d) => (d?.name || "").trim() === name)?.amount ?? 0),
    0
  );

const line = (code: Irp5SourceCode | string, label: string, amount: number): Irp5SourceCodeLine => ({
  code,
  label,
  amount: bankersRound(amount, 2),
});

/**
 * SARS certificate type selection (COMP-12).
 *
 * - IRP5  : employees' tax (PAYE) was deducted during the tax year.
 * - IT3(a): remuneration was paid but no PAYE was deducted (e.g. below the
 *           annual tax threshold, or fully offset by rebates/credits).
 */
export function determineEmployeeTaxCertificateType(
  payeDeducted: number,
  grossRemuneration: number
): EmployeeTaxCertificateType {
  if (payeDeducted > 0) return "IRP5";
  if (grossRemuneration > 0) return "IT3a";
  return "IT3a";
}

export function getEmployeeTaxCertificateLabel(type: EmployeeTaxCertificateType): string {
  return type === "IRP5" ? "IRP5" : "IT3(a)";
}

/**
 * Deterministic certificate number for reconciliation (not an official SARS cert no.).
 * Format: {IRP5|IT3a}/{taxYear}/{employerPayeRef}/{employeeKey}
 */
export function generateEmployeeTaxCertificateNumber(
  certificateType: EmployeeTaxCertificateType,
  taxYear: number,
  employerPayeRef: string,
  employee: Pick<MockEmployee, "id" | "customEmployeeId" | "taxReferenceNumber">
): string {
  const prefix = certificateType === "IRP5" ? "IRP5" : "IT3a";
  const payeKey = (employerPayeRef || "UNKNOWN").replace(/\s+/g, "").toUpperCase();
  const empKey =
    employee.customEmployeeId?.replace(/\s+/g, "") ||
    employee.taxReferenceNumber?.replace(/\s+/g, "") ||
    employee.id.slice(0, 8).toUpperCase();
  return `${prefix}/${taxYear}/${payeKey}/${empKey}`;
}

/** @deprecated Use generateEmployeeTaxCertificateNumber — kept for backward compatibility. */
export function generateIrp5CertificateNumber(
  taxYear: number,
  employerPayeRef: string,
  employee: Pick<MockEmployee, "id" | "customEmployeeId" | "taxReferenceNumber">
): string {
  return generateEmployeeTaxCertificateNumber("IRP5", taxYear, employerPayeRef, employee);
}

/** Validate employer + employee fields required before issuing a certificate. */
export function validateIrp5CertificateInputs(
  employee: MockEmployee,
  companyDetails: MockCompanyDetails | null,
  payslipsForYear: MockPayslip[],
  taxYear: number
): { errors: Irp5ValidationIssue[]; warnings: Irp5ValidationIssue[] } {
  const errors: Irp5ValidationIssue[] = [];
  const warnings: Irp5ValidationIssue[] = [];

  if (!companyDetails?.companyLegalName && !companyDetails?.companyTradingName) {
    errors.push({
      field: "employer.name",
      message: "Employer legal or trading name is required.",
      severity: "error",
    });
  }
  if (!companyDetails?.payeReferenceNumber?.trim()) {
    errors.push({
      field: "employer.payeReferenceNumber",
      message: "Employer PAYE reference number is required for IRP5.",
      severity: "error",
    });
  }
  if (!employee.firstName?.trim() || !employee.lastName?.trim()) {
    errors.push({
      field: "employee.name",
      message: "Employee first and last name are required.",
      severity: "error",
    });
  }
  if (!employee.idNumber?.trim() && !employee.taxReferenceNumber?.trim()) {
    errors.push({
      field: "employee.idNumber",
      message: "Employee ID number or tax reference number is required.",
      severity: "error",
    });
  }
  if (!employee.startDate?.trim()) {
    warnings.push({
      field: "employee.startDate",
      message: "Employment start date is missing — recommended for IRP5.",
      severity: "warning",
    });
  }
  if (!employee.taxReferenceNumber?.trim()) {
    warnings.push({
      field: "employee.taxReferenceNumber",
      message: "Employee tax reference number is missing — recommended for e@syFile.",
      severity: "warning",
    });
  }
  if (!companyDetails?.uifReferenceNumber?.trim()) {
    warnings.push({
      field: "employer.uifReferenceNumber",
      message: "Employer UIF reference is missing.",
      severity: "warning",
    });
  }
  if (payslipsForYear.length === 0) {
    errors.push({
      field: "payslips",
      message: `No payslips found for tax year ${taxYear} (${getSarsTaxYearPeriodLabel(taxYear)}).`,
      severity: "error",
    });
  }
  if (!getSarsTaxYearBounds(taxYear)) {
    warnings.push({
      field: "taxYear",
      message: `Tax year ${taxYear} is not in the curated SARS table set — verify figures manually.`,
      severity: "warning",
    });
  }

  return { errors, warnings };
}

function validateCertificateTypeConsistency(
  certificateType: EmployeeTaxCertificateType,
  payeDeducted: number,
  grossRemuneration: number
): Irp5ValidationIssue[] {
  const issues: Irp5ValidationIssue[] = [];

  if (certificateType === "IT3a" && payeDeducted > 0) {
    issues.push({
      field: "certificateType",
      message:
        "PAYE was deducted during the tax year — an IRP5 certificate is required, not IT3(a).",
      severity: "error",
    });
  }
  if (certificateType === "IRP5" && payeDeducted <= 0 && grossRemuneration > 0) {
    issues.push({
      field: "certificateType",
      message:
        "No PAYE was deducted — issue an IT3(a) certificate instead of IRP5 for below-threshold or non-taxable remuneration.",
      severity: "warning",
    });
  }
  if (grossRemuneration <= 0) {
    issues.push({
      field: "income",
      message: "No remuneration recorded for this tax year — certificate may not be required.",
      severity: "warning",
    });
  }

  return issues;
}

/**
 * Build a SARS-aligned employee tax certificate (IRP5 or IT3(a)) from filtered
 * payslips for one employee and one SARS tax year (Mar–Feb).
 */
export function buildEmployeeTaxCertificate(
  employee: MockEmployee,
  payslipsForYear: MockPayslip[],
  companyDetails: MockCompanyDetails | null,
  taxYear: number,
  issuedDate: Date = new Date()
): Irp5Certificate {
  const validationResult = validateIrp5CertificateInputs(
    employee,
    companyDetails,
    payslipsForYear,
    taxYear
  );

  const bounds = getSarsTaxYearBounds(taxYear);
  const periodLabel = getSarsTaxYearPeriodLabel(taxYear);
  const employerName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Employer";
  const payeRef = companyDetails?.payeReferenceNumber?.trim() || "";

  const grossRemuneration = payslipsForYear.reduce((s, p) => s + (p.grossEarnings || 0), 0);
  const retirementFundContributions = sumDeduction(payslipsForYear, "Retirement Fund");
  const payeDeducted = sumDeduction(payslipsForYear, "PAYE");
  const uifContributions = sumDeduction(payslipsForYear, "UIF");

  const certificateType = determineEmployeeTaxCertificateType(payeDeducted, grossRemuneration);

  const typeIssues = validateCertificateTypeConsistency(
    certificateType,
    payeDeducted,
    grossRemuneration
  );
  const errors = [
    ...validationResult.errors,
    ...typeIssues.filter((i) => i.severity === "error"),
  ];
  const warnings = [
    ...validationResult.warnings,
    ...typeIssues.filter((i) => i.severity === "warning"),
  ];

  // Taxable income = remuneration less deductible retirement contributions (Section 11F).
  const taxableIncome = Math.max(0, grossRemuneration - retirementFundContributions);

  // Section 6A medical tax credit — recomputed from employee profile × pay periods.
  const monthlyMtc = computeMonthlyMedicalTaxCredit(
    employee.medicalAidMember ?? false,
    employee.medicalAidDependants ?? 0,
    getSarsMedicalTaxCredits(taxYear)
  );
  const medicalTaxCredit = monthlyMtc * payslipsForYear.length;

  const income: Irp5SourceCodeLine[] = [];
  const deductions: Irp5SourceCodeLine[] = [];
  let nonTaxableIncome = 0;

  if (certificateType === "IT3a") {
    // IT3(a): remuneration paid without PAYE — report as non-taxable income (3605).
    nonTaxableIncome = grossRemuneration;
    if (grossRemuneration > 0) {
      income.push(
        line(IRP5_SOURCE_CODES.NON_TAXABLE_INCOME, "Non-taxable income", nonTaxableIncome)
      );
    }
    if (retirementFundContributions > 0) {
      deductions.push(
        line(
          IRP5_SOURCE_CODES.RETIREMENT_FUND,
          "Retirement fund contributions",
          retirementFundContributions
        )
      );
    }
    if (uifContributions > 0) {
      deductions.push(line(IRP5_SOURCE_CODES.UIF, "UIF contributions", uifContributions));
    }
    // IT3(a) must not include PAYE (4102) or medical tax credit (4116) lines.
  } else {
    income.push(line(IRP5_SOURCE_CODES.REMUNERATION, "Remuneration (taxable)", grossRemuneration));

    if (retirementFundContributions > 0) {
      deductions.push(
        line(
          IRP5_SOURCE_CODES.RETIREMENT_FUND,
          "Retirement fund contributions",
          retirementFundContributions
        )
      );
      deductions.push(
        line(
          IRP5_SOURCE_CODES.TOTAL_DEDUCTIONS,
          "Total deductions from remuneration",
          retirementFundContributions
        )
      );
    }
    if (payeDeducted > 0) {
      deductions.push(line(IRP5_SOURCE_CODES.PAYE, "Employees' tax (PAYE)", payeDeducted));
    }
    if (medicalTaxCredit > 0) {
      deductions.push(
        line(
          IRP5_SOURCE_CODES.MEDICAL_TAX_CREDIT,
          "Medical scheme fees tax credit",
          medicalTaxCredit
        )
      );
    }
    if (uifContributions > 0) {
      deductions.push(line(IRP5_SOURCE_CODES.UIF, "UIF contributions", uifContributions));
    }
  }

  // Employer medical aid fringe (3810/4474) not tracked on payslips yet — omit when zero.
  const employerContributions: Irp5SourceCodeLine[] = [];

  return {
    certificateNumber: generateEmployeeTaxCertificateNumber(
      certificateType,
      taxYear,
      payeRef,
      employee
    ),
    certificateType,
    taxYear,
    periodLabel,
    periodStart: bounds.start,
    periodEnd: bounds.end,
    issuedDate: issuedDate.toISOString().slice(0, 10),
    payslipCount: payslipsForYear.length,
    employer: {
      name: employerName,
      payeReferenceNumber: payeRef,
      uifReferenceNumber: companyDetails?.uifReferenceNumber,
      sdlReferenceNumber: companyDetails?.sdlReferenceNumber,
      taxNumber: companyDetails?.companyTaxNumber,
      address: companyDetails?.physicalAddress,
    },
    employee: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      fullName: `${employee.firstName} ${employee.lastName}`.trim(),
      customEmployeeId: employee.customEmployeeId,
      idNumber: employee.idNumber,
      taxReferenceNumber: employee.taxReferenceNumber,
      uifNumber: employee.uifNumber,
      dateOfBirth: employee.dateOfBirth,
      startDate: employee.startDate,
    },
    income,
    deductions,
    employerContributions,
    totals: {
      grossRemuneration: bankersRound(grossRemuneration, 2),
      retirementFundContributions: bankersRound(retirementFundContributions, 2),
      taxableIncome: bankersRound(taxableIncome, 2),
      payeDeducted: bankersRound(payeDeducted, 2),
      uifContributions: bankersRound(uifContributions, 2),
      medicalTaxCredit: bankersRound(
        certificateType === "IRP5" ? medicalTaxCredit : 0,
        2
      ),
      nonTaxableIncome: bankersRound(nonTaxableIncome, 2),
    },
    validation: {
      isValid: errors.length === 0,
      errors,
      warnings,
    },
  };
}

/** @deprecated Use buildEmployeeTaxCertificate — kept for backward compatibility. */
export function buildIrp5Certificate(
  employee: MockEmployee,
  payslipsForYear: MockPayslip[],
  companyDetails: MockCompanyDetails | null,
  taxYear: number,
  issuedDate: Date = new Date()
): Irp5Certificate {
  return buildEmployeeTaxCertificate(
    employee,
    payslipsForYear,
    companyDetails,
    taxYear,
    issuedDate
  );
}

export const formatIrp5Money = (amount: number): string =>
  amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
