import { describe, expect, it } from "vitest";
import { payslipsForPayrollRun } from "@/lib/payroll-run-payslips";

describe("payslipsForPayrollRun", () => {
  const payslips = [
    { id: "p1", payPeriod: "2026-09-23 - 2026-09-29" },
    { id: "p2", payPeriod: "2026-09-23 - 2026-09-29" },
    { id: "p3", payPeriod: "2026-09-30 - 2026-10-06" },
  ];

  it("uses only the payslips linked to this run", () => {
    const selected = payslipsForPayrollRun(
      payslips,
      [{ payslipId: "p1" }, { payslipId: "p2" }],
      "2026-09-23",
      "2026-09-29"
    );
    expect(selected.map((slip) => slip.id)).toEqual(["p1", "p2"]);
  });

  it("falls back to the run period when items have not stored payslip ids yet", () => {
    const selected = payslipsForPayrollRun(
      payslips,
      [{ payslipId: null }],
      "2026-09-23",
      "2026-09-29"
    );
    expect(selected.map((slip) => slip.id)).toEqual(["p1", "p2"]);
  });
});
