"use client";

import React from "react";
import { usePayrollProcessorState } from "@/hooks/use-payroll-processor";
import { PayrollDataContext } from "@/context/payroll-data-context-state";

export function PayrollDataProvider({ children }: { children: React.ReactNode }) {
  const value = usePayrollProcessorState();
  return <PayrollDataContext.Provider value={value}>{children}</PayrollDataContext.Provider>;
}
