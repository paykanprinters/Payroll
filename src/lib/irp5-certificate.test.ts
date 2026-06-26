import { describe, expect, it } from "vitest";
import {
  buildEmployeeTaxCertificate,
  buildIrp5Certificate,
  determineEmployeeTaxCertificateType,
  generateEmployeeTaxCertificateNumber,
  generateIrp5CertificateNumber,
  getEmployeeTaxCertificateLabel,
  IRP5_SOURCE_CODES,
  validateIrp5CertificateInputs,
} from "@/lib/irp5-certificate";
import { renderIrp5CertificateHtml } from "@/lib/report-generators/irp5-export";
import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const company: MockCompanyDetails = {
  companyLegalName: "Acme Payroll (Pty) Ltd",
  payeReferenceNumber: "7123456789",
  uifReferenceNumber: "U123456",
  sdlReferenceNumber: "L123456",
  companyTaxNumber: "9123456789",
  physicalAddress: "1 Main Rd, Cape Town",
};

const employee: MockEmployee = {
  id: "emp-001",
  customEmployeeId: "ACME-001",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  jobTitle: "Analyst",
  startDate: "2020-01-01",
  idNumber: "8001015009087",
  taxReferenceNumber: "0123456789",
  payFrequency: "Monthly",
  medicalAidMember: true,
  medicalAidDependants: 1,
  retirementFundContributionPercent: 7.5,
};

const makePayslip = (over: Partial<MockPayslip>): MockPayslip =>
  ({
    id: over.id ?? "p1",
    employeeId: "emp-001",
    payPeriod: over.payPeriod ?? "2026-03-01 - 2026-03-31",
    payDate: "2026-03-31",
    grossEarnings: 30_000,
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

describe("IRP5 certificate model (COMP-11)", () => {
  it("generates a deterministic certificate number from PAYE ref and employee key", () => {
    expect(generateIrp5CertificateNumber(2027, "7123456789", employee)).toBe(
      "IRP5/2027/7123456789/ACME-001"
    );
  });

  it("requires employer PAYE ref, employee identity, and payslips", () => {
    const { errors } = validateIrp5CertificateInputs(employee, company, [], 2027);
    expect(errors.some((e) => e.field === "payslips")).toBe(true);

    const noPaye = validateIrp5CertificateInputs(
      employee,
      { ...company, payeReferenceNumber: "" },
      [makePayslip({})],
      2027
    );
    expect(noPaye.errors.some((e) => e.field === "employer.payeReferenceNumber")).toBe(true);
  });

  it("aggregates SARS source codes from payslips (E08-style retirement case)", () => {
    const payslips = [
      makePayslip({
        deductionsBreakdown: [
          { name: "Retirement Fund", amount: 2_250 },
          { name: "UIF", amount: 177.12 },
          { name: "PAYE", amount: 4_096 },
        ],
      }),
    ];

    const cert = buildIrp5Certificate(employee, payslips, company, 2027);

    expect(cert.certificateType).toBe("IRP5");
    expect(cert.periodLabel).toContain("March 2026");
    expect(cert.totals.grossRemuneration).toBeCloseTo(30_000, 2);
    expect(cert.totals.retirementFundContributions).toBeCloseTo(2_250, 2);
    expect(cert.totals.taxableIncome).toBeCloseTo(27_750, 2);
    expect(cert.totals.payeDeducted).toBeCloseTo(4_096, 2);
    expect(cert.totals.uifContributions).toBeCloseTo(177.12, 2);

    expect(cert.income.find((l) => l.code === IRP5_SOURCE_CODES.REMUNERATION)?.amount).toBeCloseTo(
      30_000,
      2
    );
    expect(
      cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.RETIREMENT_FUND)?.amount
    ).toBeCloseTo(2_250, 2);
    expect(cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.PAYE)?.amount).toBeCloseTo(
      4_096,
      2
    );
    expect(cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.UIF)?.amount).toBeCloseTo(
      177.12,
      2
    );

    // SDL must NOT appear on the employee certificate.
    expect(cert.deductions.some((l) => l.label.includes("SDL"))).toBe(false);
    expect(cert.deductions.some((l) => l.code === "4142")).toBe(false);
  });

  it("includes Section 6A medical tax credit (4116) for medical-aid members", () => {
    const payslips = [
      makePayslip({
        deductionsBreakdown: [
          { name: "UIF", amount: 177.12 },
          { name: "PAYE", amount: 3_929 },
        ],
      }),
      makePayslip({
        id: "p2",
        payPeriod: "2026-04-01 - 2026-04-30",
        deductionsBreakdown: [
          { name: "UIF", amount: 177.12 },
          { name: "PAYE", amount: 3_929 },
        ],
      }),
    ];

    const cert = buildIrp5Certificate(employee, payslips, company, 2027);
    const mtc = cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.MEDICAL_TAX_CREDIT);
    // 752/month (main + 1 dependant TY2027) × 2 periods = 1,504
    expect(mtc?.amount).toBeCloseTo(1_504, 2);
    expect(cert.totals.medicalTaxCredit).toBeCloseTo(1_504, 2);
  });

  it("does not compute taxable income as gross minus all deductions", () => {
    const payslips = [
      makePayslip({
        deductionsBreakdown: [
          { name: "Retirement Fund", amount: 2_250 },
          { name: "Loan Repayment", amount: 500 },
          { name: "UIF", amount: 177.12 },
          { name: "PAYE", amount: 4_096 },
        ],
        totalDeductions: 7_023.12,
      }),
    ];

    const cert = buildIrp5Certificate(employee, payslips, company, 2027);
    // Wrong legacy formula would be 30,000 - 7,023.12 = 22,976.88
    expect(cert.totals.taxableIncome).toBeCloseTo(27_750, 2);
    expect(cert.totals.taxableIncome).not.toBeCloseTo(22_976.88, 2);
  });

  it("renders HTML with certificate number and source codes", () => {
    const cert = buildIrp5Certificate(
      employee,
      [
        makePayslip({
          deductionsBreakdown: [
            { name: "UIF", amount: 177.12 },
            { name: "PAYE", amount: 4_681 },
          ],
        }),
      ],
      company,
      2027
    );
    const html = renderIrp5CertificateHtml(cert, 12);
    expect(html).toContain("IRP5/2027/7123456789/ACME-001");
    expect(html).toContain("3601");
    expect(html).toContain("4102");
    expect(html).toContain("4141");
    expect(html).not.toContain("mock-up");
  });
});

describe("IT3(a) certificate handling (COMP-12)", () => {
  it("selects IRP5 when PAYE was deducted, IT3(a) when not", () => {
    expect(determineEmployeeTaxCertificateType(4_096, 30_000)).toBe("IRP5");
    expect(determineEmployeeTaxCertificateType(0, 8_500)).toBe("IT3a");
    expect(determineEmployeeTaxCertificateType(0, 0)).toBe("IT3a");
  });

  it("generates IT3a-prefixed certificate numbers", () => {
    expect(
      generateEmployeeTaxCertificateNumber("IT3a", 2027, "7123456789", employee)
    ).toBe("IT3a/2027/7123456789/ACME-001");
    expect(getEmployeeTaxCertificateLabel("IT3a")).toBe("IT3(a)");
  });

  it("issues IT3(a) with source code 3605 and no PAYE line for below-threshold earners", () => {
    const lowEarner: MockEmployee = {
      ...employee,
      medicalAidMember: false,
      medicalAidDependants: 0,
      retirementFundContributionPercent: 0,
    };
    const payslips = [
      makePayslip({
        grossEarnings: 8_500,
        deductionsBreakdown: [{ name: "UIF", amount: 85 }],
      }),
      makePayslip({
        id: "p2",
        payPeriod: "2026-04-01 - 2026-04-30",
        grossEarnings: 8_500,
        deductionsBreakdown: [{ name: "UIF", amount: 85 }],
      }),
    ];

    const cert = buildEmployeeTaxCertificate(lowEarner, payslips, company, 2027);

    expect(cert.certificateType).toBe("IT3a");
    expect(cert.certificateNumber).toMatch(/^IT3a\//);
    expect(cert.income.find((l) => l.code === IRP5_SOURCE_CODES.NON_TAXABLE_INCOME)?.amount).toBeCloseTo(
      17_000,
      2
    );
    expect(cert.income.find((l) => l.code === IRP5_SOURCE_CODES.REMUNERATION)).toBeUndefined();
    expect(cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.PAYE)).toBeUndefined();
    expect(cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.MEDICAL_TAX_CREDIT)).toBeUndefined();
    expect(cert.deductions.find((l) => l.code === IRP5_SOURCE_CODES.UIF)?.amount).toBeCloseTo(170, 2);
    expect(cert.totals.nonTaxableIncome).toBeCloseTo(17_000, 2);
    expect(cert.totals.payeDeducted).toBe(0);
    expect(cert.totals.medicalTaxCredit).toBe(0);
  });

  it("renders IT3(a) title in HTML without PAYE source code", () => {
    const cert = buildEmployeeTaxCertificate(
      { ...employee, retirementFundContributionPercent: 0 },
      [
        makePayslip({
          grossEarnings: 7_000,
          deductionsBreakdown: [{ name: "UIF", amount: 70 }],
        }),
      ],
      company,
      2027
    );
    const html = renderIrp5CertificateHtml(cert, 12);
    expect(html).toContain("IT3(a) Employee Tax Certificate");
    expect(html).toContain("3605");
    expect(html).not.toContain("4102");
    expect(html).toContain("IT3a/2027/");
  });

  it("buildIrp5Certificate alias still works for PAYE cases", () => {
    const cert = buildIrp5Certificate(
      employee,
      [
        makePayslip({
          deductionsBreakdown: [
            { name: "UIF", amount: 177.12 },
            { name: "PAYE", amount: 4_681 },
          ],
        }),
      ],
      company,
      2027
    );
    expect(cert.certificateType).toBe("IRP5");
  });
});
