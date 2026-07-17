import { describe, expect, it } from "vitest";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { filterPayslipsForBulkPeriod } from "@/lib/payslip-period-filter";

const weeklyEmployee: MockEmployee = {
  id: "e1",
  customEmployeeId: "EMP-001",
  firstName: "Test",
  lastName: "Worker",
  email: "weekly@example.com",
  jobTitle: "Tester",
  startDate: "2025-01-01",
  payFrequency: "Weekly",
  paymentMode: "Bank Transfer",
};

const monthlyEmployee: MockEmployee = {
  id: "e2",
  customEmployeeId: "EMP-002",
  firstName: "Monthly",
  lastName: "Worker",
  email: "monthly@example.com",
  jobTitle: "Tester",
  startDate: "2025-01-01",
  payFrequency: "Monthly",
  paymentMode: "Bank Transfer",
};

const payslip = (id: string, employeeId: string, payPeriod: string, grossEarnings: number): MockPayslip => ({
  id,
  employeeId,
  payPeriod,
  payDate: payPeriod.split(" - ")[1],
  grossEarnings,
  totalDeductions: grossEarnings / 10,
  netPay: grossEarnings * 0.9,
  earningsBreakdown: [],
  deductionsBreakdown: [],
  leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
  ytdGrossEarnings: grossEarnings,
  ytdTotalDeductions: grossEarnings / 10,
});

describe("filterPayslipsForBulkPeriod", () => {
  it("includes weekly payslips whose period crosses a Monday boundary (Tue cut-off)", () => {
    const weeklyPayslip = payslip("p1", "e1", "2026-01-14 - 2026-01-20", 1000);

    const selectedDate = new Date(2026, 0, 20); // Tue 20 Jan 2026
    const filtered = filterPayslipsForBulkPeriod(
      [weeklyPayslip],
      [weeklyEmployee],
      selectedDate,
      "weekly",
      { cutOffDay: 2, payDayOffset: 0 }
    );

    expect(filtered).toHaveLength(1);
  });

  it("excludes weekly payslips from the previous pay cycle", () => {
    const previousPayslip = payslip("p1", "e1", "2026-01-07 - 2026-01-13", 1000);

    const selectedDate = new Date(2026, 0, 20);
    const filtered = filterPayslipsForBulkPeriod(
      [previousPayslip],
      [weeklyEmployee],
      selectedDate,
      "weekly",
      { cutOffDay: 2, payDayOffset: 0 }
    );

    expect(filtered).toHaveLength(0);
  });

  it("filters monthly payslips by calendar month", () => {
    const monthlyPayslip = payslip("p2", "e2", "2026-01-01 - 2026-01-31", 5000);

    const selectedDate = new Date(2026, 0, 15);
    const filtered = filterPayslipsForBulkPeriod(
      [monthlyPayslip],
      [monthlyEmployee],
      selectedDate,
      "monthly",
      { cutOffDay: 2, payDayOffset: 0 }
    );

    expect(filtered).toHaveLength(1);
  });
});
