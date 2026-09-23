import { describe, expect, it } from "vitest";
import {
  aggregateDeductionTotalsForReport,
  isCashPaid,
  isProfileFieldApplicable,
  partitionPayslipsForReports,
  requiresEmployeeBankDetails,
  requiresEmployeeTaxReference,
  shouldTrackEmployeeTax,
} from "@/lib/employee-tax-tracking";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const emp = (over: Partial<MockEmployee> = {}): MockEmployee =>
  ({
    id: "e1",
    customEmployeeId: "KP001",
    firstName: "Mogamat",
    lastName: "Safodien",
    email: "m@example.com",
    jobTitle: "Operator",
    startDate: "2024-01-01",
    paymentMode: "Cash",
    trackTax: true,
    ...over,
  }) as MockEmployee;

const slip = (
  employeeId: string,
  deductions: { name: string; amount: number }[]
): MockPayslip =>
  ({
    id: `p-${employeeId}`,
    employeeId,
    payPeriod: "2026-09-01 - 2026-09-30",
    grossEarnings: 10000,
    totalDeductions: deductions.reduce((s, d) => s + d.amount, 0),
    netPay: 10000,
    deductionsBreakdown: deductions,
  }) as MockPayslip;

describe("employee-tax-tracking", () => {
  it("treats Cash payment mode as cash-paid", () => {
    expect(isCashPaid(emp())).toBe(true);
    expect(isCashPaid(emp({ paymentMode: "Bank Transfer" }))).toBe(false);
  });

  it("defaults track tax ON for cash; respects explicit off", () => {
    expect(shouldTrackEmployeeTax(emp({ trackTax: undefined }))).toBe(true);
    expect(shouldTrackEmployeeTax(emp({ trackTax: true }))).toBe(true);
    expect(shouldTrackEmployeeTax(emp({ trackTax: false }))).toBe(false);
    expect(shouldTrackEmployeeTax(emp({ paymentMode: "Bank Transfer", trackTax: false }))).toBe(
      true
    );
  });

  it("skips tax reference and bank requirements for cash", () => {
    expect(requiresEmployeeTaxReference(emp())).toBe(false);
    expect(requiresEmployeeBankDetails(emp())).toBe(false);
    expect(requiresEmployeeTaxReference(emp({ paymentMode: "Bank Transfer" }))).toBe(true);
    expect(requiresEmployeeBankDetails(emp({ paymentMode: "Bank Transfer" }))).toBe(true);
  });

  it("marks bank/tax-ref profile fields inapplicable for cash", () => {
    const cash = emp();
    expect(isProfileFieldApplicable(cash, "taxReferenceNumber")).toBe(false);
    expect(isProfileFieldApplicable(cash, "accountNumber")).toBe(false);
    expect(isProfileFieldApplicable(cash, "idNumber")).toBe(true);
  });

  it("partitions display vs tax payslips and merges PAYE/UIF into tax totals", () => {
    const cash = emp({ id: "cash" });
    const bank = emp({ id: "bank", paymentMode: "Bank Transfer", firstName: "Bank" });
    const cashOff = emp({ id: "cash-off", trackTax: false });

    const payslips = [
      slip("cash", [
        { name: "PAYE", amount: 500 },
        { name: "UIF", amount: 100 },
        { name: "Loan Repayment", amount: 50 },
      ]),
      slip("bank", [
        { name: "PAYE", amount: 1000 },
        { name: "UIF", amount: 177 },
      ]),
      slip("cash-off", [{ name: "PAYE", amount: 200 }]),
    ];

    const { displayPayslips, taxPayslips } = partitionPayslipsForReports(payslips, [
      cash,
      bank,
      cashOff,
    ]);

    expect(displayPayslips.map((p) => p.employeeId)).toEqual(["bank"]);
    expect(taxPayslips.map((p) => p.employeeId).sort()).toEqual(["bank", "cash"]);

    const totals = aggregateDeductionTotalsForReport(displayPayslips, taxPayslips);
    expect(totals.PAYE).toBe(1500);
    expect(totals.UIF).toBe(277);
    expect(totals["Loan Repayment"]).toBeUndefined();
  });
});
