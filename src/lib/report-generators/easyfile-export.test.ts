import { describe, expect, it } from "vitest";
import {
  buildEasyFileExport,
  EASYFILE_COLUMNS,
  easyFileExportFilename,
  escapeCsvField,
  generateEasyFileCsv,
  serializeEasyFileCsv,
} from "@/lib/report-generators/easyfile-export";
import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const company: MockCompanyDetails = {
  companyLegalName: "Acme Payroll (Pty) Ltd",
  payeReferenceNumber: "7123456789",
  uifReferenceNumber: "U123456",
  sdlReferenceNumber: "L123456",
  companyTaxNumber: "9123456789",
  physicalAddress: "1 Main Rd, Cape Town",
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

describe("e@syFile bulk export (COMP-13)", () => {
  it("builds a row per employee with payslips and skips those without", () => {
    const employees = [
      baseEmployee({ id: "emp-001", customEmployeeId: "ACME-001" }),
      baseEmployee({ id: "emp-002", customEmployeeId: "ACME-002", firstName: "John" }),
    ];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_096 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
    ];

    const result = buildEasyFileExport(employees, payslips, company, 2027);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].employeeId).toBe("emp-001");
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].employeeId).toBe("emp-002");
  });

  it("distinguishes IRP5 and IT3(a) certificates in the same export", () => {
    const employees = [
      baseEmployee({ id: "emp-001", customEmployeeId: "ACME-001" }),
      baseEmployee({ id: "emp-002", customEmployeeId: "ACME-002", firstName: "Sam" }),
    ];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_096 }],
      }),
      makePayslip({
        id: "p2",
        employeeId: "emp-002",
        grossEarnings: 8_500,
        deductionsBreakdown: [{ name: "UIF", amount: 85 }],
      }),
    ];

    const result = buildEasyFileExport(employees, payslips, company, 2027);
    const byId = Object.fromEntries(result.rows.map((r) => [r.employeeId, r]));

    expect(byId["emp-001"].certificate.certificateType).toBe("IRP5");
    expect(byId["emp-001"].values.certificateType).toBe("IRP5");
    expect(byId["emp-002"].certificate.certificateType).toBe("IT3a");
    expect(byId["emp-002"].values.certificateType).toBe("IT3(a)");
  });

  it("rounds source-code monetary values to whole rands", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        grossEarnings: 30_000,
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_096.49 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
    ];

    const result = buildEasyFileExport(employees, payslips, company, 2027);
    expect(result.rows[0].values.paye).toBe("4096");
    expect(result.rows[0].values.uif).toBe("177");
    expect(result.rows[0].values.incomeTaxable).toBe("30000");
  });

  it("serializes CSV with header row and CRLF line endings", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_096 }],
      }),
    ];

    const csv = generateEasyFileCsv(employees, payslips, company, 2027);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(EASYFILE_COLUMNS.map((c) => c.header).join(","));
    expect(lines[1]).toContain("IRP5");
    expect(lines[1]).toContain("7123456789");
  });

  it("escapes CSV fields containing commas, quotes, and newlines", () => {
    expect(escapeCsvField("Acme, Inc")).toBe('"Acme, Inc"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvField("plain")).toBe("plain");
  });

  it("escapes employer names with commas in serialized output", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_096 }],
      }),
    ];
    const csv = serializeEasyFileCsv(
      buildEasyFileExport(employees, payslips, { ...company, companyLegalName: "Acme, Inc" }, 2027)
    );
    expect(csv).toContain('"Acme, Inc"');
  });

  it("aggregates validation errors across certificates", () => {
    const employees = [baseEmployee({ id: "emp-001", idNumber: "", taxReferenceNumber: "" })];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_096 }],
      }),
    ];

    const result = buildEasyFileExport(employees, payslips, company, 2027);
    expect(result.hasBlockingErrors).toBe(true);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it("produces a tax-year-scoped filename", () => {
    expect(easyFileExportFilename(2027)).toBe("easyfile-certificates-TY2027.csv");
  });
});
