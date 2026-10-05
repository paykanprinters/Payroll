export type CountersignDecisionInput = {
  runStatus: string | null | undefined;
  reviewedBy: string | null | undefined;
  approverId: string | null | undefined;
  approverRole: string | null | undefined;
  approverStatus: string | null | undefined;
};

/** Why a countersign must be refused. Null means this person may approve the run. */
export function countersignBlockReason(input: CountersignDecisionInput): string | null {
  if (input.runStatus !== "Reviewed") {
    return "This payroll run is not waiting for approval.";
  }
  if (!input.reviewedBy) {
    return "This payroll run has not been reviewed yet.";
  }
  if (!input.approverId || (input.approverRole !== "Admin" && input.approverRole !== "Manager") || input.approverStatus !== "Active") {
    return "This account cannot approve payroll runs.";
  }
  if (input.approverId === input.reviewedBy) {
    return "Approval must be done by a different person than the reviewer.";
  }
  return null;
}
