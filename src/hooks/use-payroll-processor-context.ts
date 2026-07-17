import { useContext } from "react";
import { PayrollDataContext } from "@/context/payroll-data-context-state";
import type { PayrollDataValue } from "@/context/payroll-data-context-state";

/** Shared payroll data — must be used within PayrollDataProvider. */
export function usePayrollProcessor(): PayrollDataValue {
  const context = useContext(PayrollDataContext);
  if (!context) {
    throw new Error("usePayrollProcessor must be used within PayrollDataProvider");
  }
  return context;
}
