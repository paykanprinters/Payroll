import { describe, expect, it } from "vitest";
import { countersignBlockReason } from "@/lib/payroll-countersign";

const ready = {
  runStatus: "Reviewed",
  reviewedBy: "reviewer",
  approverId: "approver",
  approverRole: "Manager",
  approverStatus: "Active",
};

describe("countersignBlockReason", () => {
  it("allows a different active manager to approve a reviewed run", () => {
    expect(countersignBlockReason(ready)).toBeNull();
  });

  it("allows an admin who did not review the run", () => {
    expect(countersignBlockReason({ ...ready, approverRole: "Admin" })).toBeNull();
  });

  it("refuses the person who already reviewed the run", () => {
    expect(countersignBlockReason({ ...ready, approverId: "reviewer" })).toBe(
      "Approval must be done by a different person than the reviewer."
    );
  });

  it("refuses staff and inactive accounts", () => {
    expect(countersignBlockReason({ ...ready, approverRole: "Staff" })).toBe(
      "This account cannot approve payroll runs."
    );
    expect(countersignBlockReason({ ...ready, approverStatus: "Inactive" })).toBe(
      "This account cannot approve payroll runs."
    );
  });

  it("refuses a run that is not waiting for approval", () => {
    expect(countersignBlockReason({ ...ready, runStatus: "Draft" })).toBe(
      "This payroll run is not waiting for approval."
    );
    expect(countersignBlockReason({ ...ready, reviewedBy: null })).toBe(
      "This payroll run has not been reviewed yet."
    );
  });
});
