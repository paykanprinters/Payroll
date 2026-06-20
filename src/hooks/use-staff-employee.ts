"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { MockEmployee } from "@/lib/mock-data-interfaces";

export type StaffEmployeeStatus =
  | "loading"
  | "unauthenticated"
  | "no_link"
  | "no_access"
  | "ready";

export function useStaffEmployee() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { employees, isLoadingEmployees } = usePayrollProcessor();

  const employee = useMemo<MockEmployee | null>(() => {
    if (!user?.id) return null;
    return employees.find((emp) => emp.userId === user.id) ?? null;
  }, [employees, user?.id]);

  const status = useMemo<StaffEmployeeStatus>(() => {
    if (isLoadingAuth || isLoadingEmployees) return "loading";
    if (!isAuthenticated || !user) return "unauthenticated";
    if (!employee) return "no_link";
    if (employee.portalAccess !== true) return "no_access";
    return "ready";
  }, [employee, isAuthenticated, isLoadingAuth, isLoadingEmployees, user]);

  return {
    employee,
    status,
    isLoading: status === "loading",
    isReady: status === "ready",
  };
}
