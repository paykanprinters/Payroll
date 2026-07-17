import { describe, it, expect } from "vitest";
import { computeDeductionsBreakdown } from "@/lib/dashboard-metrics";
import { cleanPayslipBreakdownLabel } from "@/lib/payslip-label-utils";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

describe("cleanPayslipBreakdownLabel", () => {
  it("strips trailing UUID suffixes from historical labels", () => {
    expect(
      cleanPayslipBreakdownLabel("Loan Repayment (a1b2c3d4-e5f6-7890-abcd-ef1234567890)")
    ).toBe("Loan Repayment");
    expect(cleanPayslipBreakdownLabel("PAYE")).toBe("PAYE");
  });
});

describe("computeDeductionsBreakdown", () => {
  it("merges historical UUID-suffixed deduction names into clean type labels", () => {
    const payslips = [
      {
        id: "p1",
        employeeId: "e1",
        payPeriod: "2025-01-01 - 2025-01-31",
        deductionsBreakdown: [
          { name: "Loan Repayment (aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)", amount: 100 },
          { name: "Loan Repayment (ffffffff-1111-2222-3333-444444444444)", amount: 50 },
          { name: "PAYE", amount: 200 },
        ],
      },
    ] as MockPayslip[];

    const rows = computeDeductionsBreakdown(payslips);
    expect(rows).toEqual(
      expect.arrayContaining([
        { name: "Loan Repayment", value: 150 },
        { name: "PAYE", value: 200 },
      ])
    );
    expect(rows.every((r) => !/[0-9a-f]{8}-[0-9a-f]{4}/i.test(r.name))).toBe(true);
  });
});
