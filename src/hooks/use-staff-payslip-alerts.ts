import { useContext } from "react";
import {
  StaffPayslipAlertsContext,
  type StaffPayslipAlertsValue,
} from "@/context/staff-payslip-alerts-state";

export function useStaffPayslipAlerts(): StaffPayslipAlertsValue {
  const context = useContext(StaffPayslipAlertsContext);
  if (!context) {
    throw new Error("useStaffPayslipAlerts must be used within StaffPayslipAlertsProvider");
  }
  return context;
}
