import { createContext } from "react";
import type { usePayrollProcessorState } from "@/hooks/use-payroll-processor";

export type PayrollDataValue = ReturnType<typeof usePayrollProcessorState>;

export const PayrollDataContext = createContext<PayrollDataValue | null>(null);
