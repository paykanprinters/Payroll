import { describe, expect, it } from "vitest";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { filterPayslipsForBulkPeriod } from "@/lib/payslip-period-filter";

const weeklyEmployee: MockEmployee = {
  id: "e1",
  firstName: "Test",
  lastName: "Worker",
  payFrequency: "Weekly",
  paymentMode: "EFT",
} as MockEmployee;

const monthlyEmployee: MockEmployee = {
  id: "e2",
  firstName: "Monthly",
  lastName: "Worker",
  payFrequency: "Monthly",
  paymentMode: "EFT",
} as MockEmployee;

describe("filterPayslipsForBulkPeriod", () => {
  it("includes weekly payslips whose period crosses a Monday boundary (Tue cut-off)", () => {
    const payslip: MockPayslip = {
      id: "p1",
      employeeId: "e1",
      payPeriod: "2026-01-14 - 2026-01-20",
      grossEarnings: 1000,
      totalDeductions: 100,
      netPay: 900,
      deductionsBreakdown: [],
    } as MockPayslip;

    const selectedDate = new Date(2026, 0, 20); // Tue 20 Jan 2026
    const filtered = filterPayslipsForBulkPeriod(
      [payslip],
      [weeklyEmployee],
      selectedDate,
      "weekly",
      { cutOffDay: 2, payDayOffset: 0 }
    );

    expect(filtered).toHaveLength(1);
  });

  it("excludes weekly payslips from the previous pay cycle", () => {
    const payslip: MockPayslip = {
      id: "p1",
      employeeId: "e1",
      payPeriod: "2026-01-07 - 2026-01-13",
      grossEarnings: 1000,
      totalDeductions: 100,
      netPay: 900,
      deductionsBreakdown: [],
    } as MockPayslip;

    const selectedDate = new Date(2026, 0, 20);
    const filtered = filterPayslipsForBulkPeriod(
      [payslip],
      [weeklyEmployee],
      selectedDate,
      "weekly",
      { cutOffDay: 2, payDayOffset: 0 }
    );

    expect(filtered).toHaveLength(0);
  });

  it("filters monthly payslips by calendar month", () => {
    const payslip: MockPayslip = {
      id: "p2",
      employeeId: "e2",
      payPeriod: "2026-01-01 - 2026-01-31",
      grossEarnings: 5000,
      totalDeductions: 500,
      netPay: 4500,
      deductionsBreakdown: [],
    } as MockPayslip;

    const selectedDate = new Date(2026, 0, 15);
    const filtered = filterPayslipsForBulkPeriod(
      [payslip],
      [monthlyEmployee],
      selectedDate,
      "monthly",
      { cutOffDay: 2, payDayOffset: 0 }
    );

    expect(filtered).toHaveLength(1);
  });
});
