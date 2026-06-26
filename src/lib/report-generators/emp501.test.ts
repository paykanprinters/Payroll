import { describe, expect, it } from "vitest";
import {
  computeEmp501Reconciliation,
  generateEmp501ReportContent,
} from "@/lib/report-generators/emp501";
import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const company: MockCompanyDetails = {
  companyLegalName: "Acme Payroll (Pty) Ltd",
  payeReferenceNumber: "7123456789",
  uifReferenceNumber: "U123456",
  sdlReferenceNumber: "L123456",
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
    employerSdl: over.employerSdl ?? 300,
    ...over,
  }) as MockPayslip;

describe("EMP501 reconciliation (COMP-14)", () => {
  it("groups payslips into monthly EMP201 lines for the tax year", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        id: "p1",
        payPeriod: "2026-03-01 - 2026-03-31",
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_000 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
      makePayslip({
        id: "p2",
        payPeriod: "2026-04-01 - 2026-04-30",
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_000 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
    ];

    const recon = computeEmp501Reconciliation(employees, payslips, company, 2027);

    expect(recon.monthly).toHaveLength(2);
    expect(recon.monthly[0].monthLabel).toBe("March 2026");
    expect(recon.monthly[1].monthLabel).toBe("April 2026");
    expect(recon.emp201YearTotals.paye).toBeCloseTo(8_000, 2);
  });

  it("reconciles PAYE and UIF between EMP201 totals and certificates (balanced)", () => {
    const employees = [
      baseEmployee({ id: "emp-001", customEmployeeId: "ACME-001" }),
      baseEmployee({ id: "emp-002", customEmployeeId: "ACME-002", firstName: "Sam" }),
    ];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_000 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
      makePayslip({
        id: "p2",
        employeeId: "emp-002",
        deductionsBreakdown: [
          { name: "PAYE", amount: 2_500 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
    ];

    const recon = computeEmp501Reconciliation(employees, payslips, company, 2027);

    expect(recon.certificateTotals.certificateCount).toBe(2);
    expect(recon.certificateTotals.irp5Count).toBe(2);
    expect(recon.emp201YearTotals.paye).toBeCloseTo(6_500, 2);
    expect(recon.certificateTotals.paye).toBeCloseTo(6_500, 2);

    const payeLine = recon.reconciliation.find((r) => r.label.includes("PAYE"));
    expect(payeLine?.difference).toBeCloseTo(0, 2);
    expect(recon.isBalanced).toBe(true);
  });

  it("counts IRP5 and IT3(a) certificates separately", () => {
    const employees = [
      baseEmployee({ id: "emp-001", customEmployeeId: "ACME-001" }),
      baseEmployee({ id: "emp-002", customEmployeeId: "ACME-002", firstName: "Low" }),
    ];
    const payslips = [
      makePayslip({
        id: "p1",
        employeeId: "emp-001",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_000 }],
      }),
      makePayslip({
        id: "p2",
        employeeId: "emp-002",
        grossEarnings: 8_000,
        deductionsBreakdown: [{ name: "UIF", amount: 80 }],
      }),
    ];

    const recon = computeEmp501Reconciliation(employees, payslips, company, 2027);
    expect(recon.certificateTotals.irp5Count).toBe(1);
    expect(recon.certificateTotals.it3aCount).toBe(1);
  });

  it("excludes payslips outside the tax-year window", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        id: "in",
        payPeriod: "2026-03-01 - 2026-03-31",
        deductionsBreakdown: [{ name: "PAYE", amount: 4_000 }],
      }),
      makePayslip({
        id: "out",
        payPeriod: "2025-02-01 - 2025-02-28",
        deductionsBreakdown: [{ name: "PAYE", amount: 9_999 }],
      }),
    ];

    const recon = computeEmp501Reconciliation(employees, payslips, company, 2027);
    expect(recon.monthly).toHaveLength(1);
    expect(recon.emp201YearTotals.paye).toBeCloseTo(4_000, 2);
  });

  it("renders an HTML report with balance status and monthly breakdown", () => {
    const employees = [baseEmployee({ id: "emp-001" })];
    const payslips = [
      makePayslip({
        id: "p1",
        deductionsBreakdown: [
          { name: "PAYE", amount: 4_000 },
          { name: "UIF", amount: 177.12 },
        ],
      }),
    ];

    const html = generateEmp501ReportContent(
      payslips,
      employees,
      new Date(2027, 0, 1),
      "yearly",
      company
    );
    expect(html).toContain("EMP501 Employer Reconciliation");
    expect(html).toContain("March 2026");
    expect(html).toContain("Reconciliation balanced");
  });

  it("returns a no-data message when no payslips exist for the year", () => {
    const html = generateEmp501ReportContent([], [baseEmployee({})], new Date(2027, 0, 1), "yearly", company);
    expect(html).toContain("No payslip data");
  });
});
