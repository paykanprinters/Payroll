import { describe, expect, it } from "vitest";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import {
  buildPayslipEmailPayload,
  formatPeriodLabel,
  isValidEmail,
} from "@/lib/email/build-payslip-email-payload";

const employee = (overrides: Partial<MockEmployee> = {}): MockEmployee =>
  ({
    id: "e1",
    firstName: "Thandi",
    lastName: "Mokoena",
    email: "thandi@example.com",
    ...overrides,
  }) as MockEmployee;

const payslip = (overrides: Partial<MockPayslip> = {}): MockPayslip =>
  ({
    id: "p1",
    employeeId: "e1",
    payPeriod: "2026-01-14 - 2026-01-20",
    grossEarnings: 5000,
    totalDeductions: 800,
    netPay: 4200,
    deductionsBreakdown: [],
    ...overrides,
  }) as MockPayslip;

describe("isValidEmail", () => {
  it("accepts a well-formed address and rejects junk", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("formatPeriodLabel", () => {
  it("renders a readable date range", () => {
    expect(formatPeriodLabel("2026-01-14 - 2026-01-20")).toBe("2026-01-14 – 2026-01-20");
  });
});

describe("buildPayslipEmailPayload", () => {
  it("builds a complete payload for a valid employee + payslip", () => {
    const result = buildPayslipEmailPayload(employee(), payslip(), "Kan Printers");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.employee).toEqual({ name: "Thandi Mokoena", email: "thandi@example.com" });
    expect(result.payload.payslip.netPay).toBe(4200);
    expect(result.payload.payslip.periodLabel).toBe("2026-01-14 – 2026-01-20");
    expect(result.payload.companyName).toBe("Kan Printers");
    expect(result.payload.pdfFilename).toBe("payslip-thandi-mokoena-2026-01-14_-_2026-01-20.pdf");
  });

  it("fails when the employee has no valid email", () => {
    const result = buildPayslipEmailPayload(employee({ email: "" }), payslip(), "Kan Printers");
    expect(result).toEqual({ ok: false, reason: "no-email" });
  });

  it("fails when the payslip has no pay period", () => {
    const result = buildPayslipEmailPayload(employee(), payslip({ payPeriod: "" }), "Kan Printers");
    expect(result).toEqual({ ok: false, reason: "no-period" });
  });

  it("falls back to a default company name when blank", () => {
    const result = buildPayslipEmailPayload(employee(), payslip(), "  ");
    expect(result.ok && result.payload.companyName).toBe("Payroll");
  });
});
