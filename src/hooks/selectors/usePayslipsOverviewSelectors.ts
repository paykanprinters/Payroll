"use client";

import { useMemo, useCallback } from "react";
import { MockPayslip, MockEmployee } from "@/lib/mock-data-interfaces";

export type FrequencyFilter = "all" | "Monthly" | "Weekly" | "Bi-Weekly";

export interface PayslipsOverviewFilters {
  employeeFilterId: string; // "all" or specific employee id
  frequencyFilter: FrequencyFilter;
  dateStart: string; // YYYY-MM-DD or empty
  dateEnd: string;   // YYYY-MM-DD or empty
  search: string;
}

const cleanLabel = (label: string) =>
  label.replace(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)\s*$/i, "");

export const usePayslipsOverviewSelectors = (
  payslips: MockPayslip[],
  employees: MockEmployee[],
  filters: PayslipsOverviewFilters
) => {
  const employeesById = useMemo(() => {
    const map = new Map<string, { name: string; customId: string; frequency?: string }>();
    employees.forEach(e => map.set(e.id, {
      name: `${e.firstName} ${e.lastName}`.trim(),
      customId: e.customEmployeeId || "N/A",
      frequency: e.payFrequency
    }));
    return map;
  }, [employees]);

  const filteredPayslips = useMemo(() => {
    const { employeeFilterId, frequencyFilter, dateStart, dateEnd, search } = filters;
    let list = [...payslips];

    if (employeeFilterId !== "all") {
      list = list.filter(p => p.employeeId === employeeFilterId);
    }

    if (frequencyFilter !== "all") {
      list = list.filter(p => {
        const freq = employeesById.get(p.employeeId)?.frequency;
        return freq === frequencyFilter;
      });
    }

    if (dateStart) {
      list = list.filter(p => {
        const [startStr] = p.payPeriod.split(" - ");
        return startStr >= dateStart;
      });
    }
    if (dateEnd) {
      list = list.filter(p => {
        const [, endStr] = p.payPeriod.split(" - ");
        return endStr <= dateEnd;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p => {
        const emp = employeesById.get(p.employeeId);
        const hay = `${emp?.name || ""} ${emp?.customId || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // newest first by period start (string-based, matching current logic)
    list.sort((a, b) => {
      const [sa] = a.payPeriod.split(" - ");
      const [sb] = b.payPeriod.split(" - ");
      return new Date(sb).getTime() - new Date(sa).getTime();
    });

    return list;
  }, [payslips, employeesById, filters]);

  const totals = useMemo(() => {
    const gross = filteredPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
    const net = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);
    const count = filteredPayslips.length;
    return {
      gross, net, count,
      filteredCount: filteredPayslips.length,
      totalCount: payslips.length
    };
  }, [filteredPayslips, payslips]);

  const payrollSummaryData = useMemo(() => {
    const gross = filteredPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
    const net = filteredPayslips.reduce((sum, p) => sum + p.netPay, 0);
    return [{ name: "Filtered Payroll", gross, net }];
  }, [filteredPayslips]);

  const deductionsBreakdownData = useMemo(() => {
    const deductionsMap = new Map<string, number>();
    filteredPayslips.forEach(payslip => {
      payslip.deductionsBreakdown.forEach(deduction => {
        const label = cleanLabel(deduction.name);
        deductionsMap.set(label, (deductionsMap.get(label) || 0) + deduction.amount);
      });
    });
    return Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredPayslips]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const findMostRecentPayslipForEmployee = useCallback((employeeId: string) => {
    const forEmp = payslips.filter(p => p.employeeId === employeeId);
    if (forEmp.length === 0) return undefined;
    return [...forEmp].sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
  }, [payslips]);

  return {
    employeesById,
    filteredPayslips,
    totals,
    payrollSummaryData,
    deductionsBreakdownData,
    getEmployeeName,
    findMostRecentPayslipForEmployee,
  };
};