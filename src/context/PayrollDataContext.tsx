"use client";

import React, { createContext, useContext } from "react";
import { usePayrollProcessorState } from "@/hooks/use-payroll-processor";

type PayrollDataValue = ReturnType<typeof usePayrollProcessorState>;

const PayrollDataContext = createContext<PayrollDataValue | null>(null);

export function PayrollDataProvider({ children }: { children: React.ReactNode }) {
  const value = usePayrollProcessorState();
  return <PayrollDataContext.Provider value={value}>{children}</PayrollDataContext.Provider>;
}

/** Shared payroll data — must be used within PayrollDataProvider. */
export function usePayrollProcessor(): PayrollDataValue {
  const ctx = useContext(PayrollDataContext);
  if (!ctx) {
    throw new Error("usePayrollProcessor must be used within PayrollDataProvider");
  }
  return ctx;
}
