import { describe, expect, it } from "vitest";
import { calendarDateFromIso, formatPayrollPeriod, payslipsForPayrollPeriod } from "@/lib/payroll-period-guard";

describe("payslipsForPayrollPeriod", () => {
  it("matches only the exact pay week already stored", () => {
    const start = new Date(2026, 8, 15);
    const end = new Date(2026, 8, 21);
    const payslips = [
      { id: "a", payPeriod: "2026-09-15 - 2026-09-21" },
      { id: "b", payPeriod: "2026-09-15 - 2026-09-21" },
      { id: "c", payPeriod: "2026-09-22 - 2026-09-28" },
    ];

    expect(formatPayrollPeriod(start, end)).toBe("2026-09-15 - 2026-09-21");
    expect(payslipsForPayrollPeriod(payslips, start, end).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("keeps a payroll run date on the same calendar day", () => {
    const start = calendarDateFromIso("2026-09-23");
    const end = calendarDateFromIso("2026-10-29");
    expect(formatPayrollPeriod(start, end)).toBe("2026-09-23 - 2026-10-29");
  });
});
