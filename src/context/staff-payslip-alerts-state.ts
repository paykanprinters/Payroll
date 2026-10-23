import { createContext } from "react";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

export type StaffPayslipAlertsValue = {
  /** Employee's payslips not yet opened, newest first. Empty until view history has loaded. */
  unseenPayslips: MockPayslip[];
  isUnseen: (payslipId: string) => boolean;
  markSeen: (payslip: MockPayslip) => void;
};

export const StaffPayslipAlertsContext = createContext<StaffPayslipAlertsValue | null>(null);
