import { describe, expect, it } from "vitest";
import { loanPayslipFigures } from "./loan-payslip";

describe("loanPayslipFigures", () => {
  it("shows this period's deduction and the balance left after it", () => {
    expect(
      loanPayslipFigures(
        [
          { employeeId: "a", remainingBalance: 800 },
          { employeeId: "a", remainingBalance: 0 },
          { employeeId: "b", remainingBalance: 100 },
        ],
        "a",
        200
      )
    ).toEqual({ loanDeduction: 200, loanBalance: 800 });
  });

  it("hides the lines when the employee has no loan", () => {
    expect(loanPayslipFigures([], "a", 0)).toEqual({ loanDeduction: null, loanBalance: null });
  });

  it("still shows a balance when this period's deduction was paused", () => {
    expect(loanPayslipFigures([{ employeeId: "a", remainingBalance: 1200 }], "a", 0)).toEqual({
      loanDeduction: 0,
      loanBalance: 1200,
    });
  });
});
