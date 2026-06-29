import { describe, expect, it } from "vitest";
import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { buildPayslipSmsPayload } from "@/lib/sms/build-payslip-sms-payload";

const employee = (overrides: Partial<MockEmployee> = {}): MockEmployee =>
  ({
    id: "e1",
    firstName: "Thandi",
    lastName: "Mokoena",
    email: "thandi@example.com",
    phoneNumber: "0822962062",
    ...overrides,
  }) as MockEmployee;

const payslip = (overrides: Partial<MockPayslip> = {}): MockPayslip =>
  ({
    id: "p1",
    employeeId: "e1",
    payPeriod: "2026-01-14 - 2026-01-20",
    netPay: 4200,
    ...overrides,
  }) as MockPayslip;

describe("buildPayslipSmsPayload", () => {
  it("builds a payload with a normalized phone number", () => {
    const result = buildPayslipSmsPayload(employee(), payslip(), "Kan Printers");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.employee).toEqual({ name: "Thandi Mokoena", phone: "27822962062" });
    expect(result.payload.payslip.periodLabel).toBe("2026-01-14 – 2026-01-20");
    expect(result.payload.payslip.netPay).toBe(4200);
  });

  it("fails when the employee has no valid mobile number", () => {
    const result = buildPayslipSmsPayload(employee({ phoneNumber: "" }), payslip(), "Kan Printers");
    expect(result).toEqual({ ok: false, reason: "no-phone" });
  });

  it("fails when the payslip has no pay period", () => {
    const result = buildPayslipSmsPayload(employee(), payslip({ payPeriod: "" }), "Kan Printers");
    expect(result).toEqual({ ok: false, reason: "no-period" });
  });
});
