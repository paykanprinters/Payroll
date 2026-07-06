import { describe, expect, it } from "vitest";
import {
  isValidIncomeTaxReference,
  isValidPayeReference,
  validateEasyFileCsvStructure,
  validateEasyFileExport,
} from "./easyfile-validation";
import { buildEasyFileExport, generateEasyFileCsv } from "./easyfile-export";
import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const company: MockCompanyDetails = {
  companyLegalName: "Acme Payroll (Pty) Ltd",
  payeReferenceNumber: "7123456789",
  uifReferenceNumber: "U123456",
};

const baseEmployee = (over: Partial<MockEmployee>): MockEmployee =>
  ({
    id: over.id ?? "emp-001",
    customEmployeeId: over.customEmployeeId ?? "ACME-001",
    firstName: over.firstName ?? "Jane",
    lastName: over.lastName ?? "Doe",
    email: "jane@example.com",
    jobTitle: "Analyst",
    startDate: "2020-01-01",
    idNumber: over.idNumber ?? "8001015009087",
    taxReferenceNumber: over.taxReferenceNumber ?? "0123456789",
    dateOfBirth: "1980-01-01",
    payFrequency: "Monthly",
    ...over,
  }) as MockEmployee;

const makePayslip = (over: Partial<MockPayslip>): MockPayslip =>
  ({
    id: over.id ?? "p1",
    employeeId: over.employeeId ?? "emp-001",
    payPeriod: over.payPeriod ?? "2026-03-01 - 2026-03-31",
    payDate: "2026-03-31",
    grossEarnings: over.grossEarnings ?? 30_000,
    totalDeductions: 0,
    netPay: 0,
    earningsBreakdown: [],
    deductionsBreakdown: over.deductionsBreakdown ?? [],
    leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
    ytdGrossEarnings: 0,
    ytdTotalDeductions: 0,
    ...over,
  }) as MockPayslip;

describe("e@syFile validation helpers", () => {
  it("validates PAYE and income tax reference formats", () => {
    expect(isValidPayeReference("7123456789")).toBe(true);
    expect(isValidPayeReference("8123456789")).toBe(false);
    expect(isValidIncomeTaxReference("0123456789")).toBe(true);
    expect(isValidIncomeTaxReference("12345")).toBe(false);
  });
});

describe("validateEasyFileExport", () => {
  it("passes a clean export with valid employee and employer data", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_096 },
          { name: "UIF", amount: 177 },
        ],
      }),
    ];

    const exportData = buildEasyFileExport(employees, payslips, company, 2027);
    expect(exportData.validation.isValid).toBe(true);
    expect(exportData.hasBlockingErrors).toBe(false);
  });

  it("blocks export when ID and tax reference are both missing", () => {
    const employees = [baseEmployee({ idNumber: "", taxReferenceNumber: "" })];
    const payslips = [
      makePayslip({
        deductionsBreakdown: [{ name: "PAYE", amount: 4_096 }],
      }),
    ];

    const exportData = buildEasyFileExport(employees, payslips, company, 2027);
    expect(exportData.hasBlockingErrors).toBe(true);
    expect(exportData.validation.errors.some((e) => e.code === "EMPLOYEE_IDENTITY_MISSING")).toBe(
      true
    );
  });

  it("flags IT3(a) rows that incorrectly declare PAYE", () => {
    const employees = [baseEmployee({ id: "emp-002", customEmployeeId: "ACME-002" })];
    const payslips = [
      makePayslip({
        employeeId: "emp-002",
        grossEarnings: 8_500,
        deductionsBreakdown: [{ name: "PAYE", amount: 100 }],
      }),
    ];

    const built = buildEasyFileExport(employees, payslips, company, 2027);
    const row = built.rows[0];
    row.values.certificateType = "IT3(a)";
    row.values.paye = "100";

    const report = validateEasyFileExport({ ...built, rows: [row] }, company);
    expect(report.errors.some((e) => e.code === "IT3A_PAYE_FORBIDDEN")).toBe(true);
  });

  it("detects duplicate employee numbers in the same export", () => {
    const employees = [
      baseEmployee({ id: "emp-001", customEmployeeId: "DUP-001" }),
      baseEmployee({ id: "emp-002", customEmployeeId: "DUP-001", firstName: "John" }),
    ];
    const payslips = [
      makePayslip({ id: "p1", employeeId: "emp-001", deductionsBreakdown: [{ name: "PAYE", amount: 100 }] }),
      makePayslip({ id: "p2", employeeId: "emp-002", deductionsBreakdown: [{ name: "PAYE", amount: 100 }] }),
    ];

    const exportData = buildEasyFileExport(employees, payslips, company, 2027);
    expect(exportData.validation.errors.some((e) => e.code === "DUPLICATE_EMPLOYEE_NUMBER")).toBe(
      true
    );
  });
});

describe("validateEasyFileCsvStructure", () => {
  it("accepts generated CSV with header and data rows", () => {
    const csv = generateEasyFileCsv(
      [baseEmployee({})],
      [makePayslip({ deductionsBreakdown: [{ name: "PAYE", amount: 4_096 }] })],
      company,
      2027
    );
    const issues = validateEasyFileCsvStructure(csv);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});
