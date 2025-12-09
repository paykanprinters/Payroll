"use client";

import React, { useState, useEffect } from "react";
import { useDashboardSettings } from "@/hooks/use-dashboard-settings";
import { Loader2 } from "lucide-react";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { format } from "date-fns";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";

// Import new modular components
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";
import ToDoList from "@/components/ToDoList";
import DashboardMonthlyPayrollOverviewChart from "@/components/dashboard/DashboardMonthlyPayrollOverviewChart";
import DashboardCurrentDateCalendar from "@/components/dashboard/DashboardCurrentDateCalendar";
import PayrollRunCard from "@/components/payroll/PayrollRunCard";
import DashboardEmployeeJobTitleDistributionChart from "@/components/dashboard/DashboardEmployeeJobTitleDistributionChart";
import DashboardTotalDeductionsBreakdownChart from "@/components/dashboard/DashboardTotalDeductionsBreakdownChart";
import DashboardAverageNetPayTrendChart from "@/components/dashboard/DashboardAverageNetPayTrendChart";
import DashboardEmployeeSalaryDistributionChart from "@/components/dashboard/DashboardEmployeeSalaryDistributionChart";
import DashboardMonthlyLeaveDaysTakenChart from "@/components/dashboard/DashboardMonthlyLeaveDaysTakenChart";
import DashboardQuickActionsCard from "@/components/dashboard/DashboardQuickActionsCard";

function getMonthKeyFromDateInput(input: unknown): string | null {
  // Accepts either "YYYY-MM-..." strings, Date instances, or other ISO strings
  if (typeof input === "string") {
    if (input.length >= 7) return input.slice(0, 7);
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    }
    return null;
  }
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }
  return null;
}

function isFiniteNumber(v: any): v is number {
  return typeof v === "number" && isFinite(v);
}

const Dashboard: React.FC = () => {
  const {
    employees,
    payslips,
    leaveRecords,
    isMockDataEnabled,
    companyDetails,
    toDos,
    pendingCount,
    markToDoAsDone,
    payCycleSettings,
    isLoadingPayCycleSettings,
    runPayrollProcess,
    calculateSinglePayslipPreview,
  } = usePayrollProcessor();
  const { visibleWidgets, isLoadingSettings } = useDashboardSettings({ isMockDataEnabled });

  const [employeeCount, setEmployeeCount] = useState(0);
  const [recentPayslipCount, setRecentPayslipCount] = useState(0);
  const [employeeJobTitleData, setEmployeeJobTitleData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyPayrollData, setMonthlyPayrollData] = useState<{ name: string; payroll: number }[]>([]);
  const [totalDeductionsBreakdown, setTotalDeductionsBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [averageNetPayTrend, setAverageNetPayTrend] = useState<{ name: string; avgNetPay: number }[]>([]);
  const [employeeSalaryDistribution, setEmployeeSalaryDistribution] = useState<{ range: string; count: number }[]>([]);
  const [leaveDaysTakenTrend, setLeaveDaysTakenTrend] = useState<{ name: string; days: number }[]>([]);

  // Live payslip design settings from Supabase
  const { settings: payslipDesignSettings, isLoading: isLoadingPayslipDesignSettings } = usePayslipDesignSettings();

  const loadDashboardData = React.useCallback(() => {
    // Counts
    setEmployeeCount(Array.isArray(employees) ? employees.length : 0);
    setRecentPayslipCount(Array.isArray(payslips) ? payslips.length : 0);

    // Job titles
    const jobTitleMap = new Map<string, number>();
    (employees ?? []).forEach((emp: any) => {
      const key = typeof emp?.jobTitle === "string" && emp.jobTitle.trim().length > 0 ? emp.jobTitle : "Unspecified";
      jobTitleMap.set(key, (jobTitleMap.get(key) || 0) + 1);
    });
    setEmployeeJobTitleData(Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value })));

    // Monthly payroll (gross earnings)
    const monthlyGrossPayMap = new Map<string, number>();
    (payslips ?? []).forEach((p: any) => {
      const monthKey = getMonthKeyFromDateInput(p?.payPeriod);
      const gross = Number(p?.grossEarnings ?? 0);
      if (!monthKey || !isFinite(gross)) return;
      monthlyGrossPayMap.set(monthKey, (monthlyGrossPayMap.get(monthKey) || 0) + gross);
    });
    const sortedMonthlyPayrollData = Array.from(monthlyGrossPayMap.entries())
      .map(([monthKey, payroll]) => ({
        key: monthKey,
        name: format(new Date(`${monthKey}-01`), "MMM yyyy"),
        payroll,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .map(({ name, payroll }) => ({ name, payroll }));
    setMonthlyPayrollData(sortedMonthlyPayrollData);

    // Deductions breakdown
    const deductionsMap = new Map<string, number>();
    (payslips ?? []).forEach((p: any) => {
      const items: any[] = Array.isArray(p?.deductionsBreakdown) ? p.deductionsBreakdown : [];
      items.forEach((deduction) => {
        const label = typeof deduction?.name === "string" && deduction.name.trim().length > 0 ? deduction.name : "Other";
        const amount = Number(deduction?.amount ?? 0);
        if (!isFinite(amount)) return;
        deductionsMap.set(label, (deductionsMap.get(label) || 0) + amount);
      });
    });
    setTotalDeductionsBreakdown(Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value })));

    // Average net pay trend
    const monthlyNetPayMap = new Map<string, { totalNetPay: number; employeeCount: number }>();
    (payslips ?? []).forEach((p: any) => {
      const monthKey = getMonthKeyFromDateInput(p?.payPeriod);
      const net = Number(p?.netPay ?? 0);
      if (!monthKey || !isFinite(net)) return;
      const current = monthlyNetPayMap.get(monthKey) || { totalNetPay: 0, employeeCount: 0 };
      monthlyNetPayMap.set(monthKey, {
        totalNetPay: current.totalNetPay + net,
        employeeCount: current.employeeCount + 1,
      });
    });
    const sortedAverageNetPay = Array.from(monthlyNetPayMap.entries())
      .map(([monthKey, data]) => ({
        key: monthKey,
        name: format(new Date(`${monthKey}-01`), "MMM yyyy"),
        avgNetPay: data.employeeCount > 0 ? data.totalNetPay / data.employeeCount : 0,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .map(({ name, avgNetPay }) => ({ name, avgNetPay }));
    setAverageNetPayTrend(sortedAverageNetPay);

    // Salary distribution
    const salaryRanges = [
      { range: "R0 - R20k", min: 0, max: 20000, count: 0 },
      { range: "R20k - R40k", min: 20001, max: 40000, count: 0 },
      { range: "R40k - R60k", min: 40001, max: 60000, count: 0 },
      { range: "R60k+", min: 60001, max: Infinity, count: 0 },
    ];
    (employees ?? []).forEach((emp: any) => {
      const salary = Number(emp?.salary ?? 0);
      const amount = isFinite(salary) ? salary : 0;
      for (const range of salaryRanges) {
        if (amount >= range.min && amount <= range.max) {
          range.count++;
          break;
        }
      }
    });
    setEmployeeSalaryDistribution(salaryRanges.map((r) => ({ range: r.range, count: r.count })));

    // Leave days taken trend
    const monthlyLeaveDaysMap = new Map<string, number>();
    (leaveRecords ?? []).forEach((record: any) => {
      const monthKey = getMonthKeyFromDateInput(record?.startDate);
      const days = Number(record?.workingDays ?? 0);
      if (!monthKey || !isFinite(days)) return;
      monthlyLeaveDaysMap.set(monthKey, (monthlyLeaveDaysMap.get(monthKey) || 0) + days);
    });
    const sortedLeaveDaysTrend = Array.from(monthlyLeaveDaysMap.entries())
      .map(([monthKey, days]) => ({
        key: monthKey,
        name: format(new Date(`${monthKey}-01`), "MMM yyyy"),
        days,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
      .map(({ name, days }) => ({ name, days }));
    setLeaveDaysTakenTrend(sortedLeaveDaysTrend);
  }, [employees, payslips, leaveRecords, payCycleSettings, calculateSinglePayslipPreview]);

  useEffect(() => {
    loadDashboardData();
    window.addEventListener("allMockDataUpdated", loadDashboardData);
    window.addEventListener("employeesUpdated", loadDashboardData);
    window.addEventListener("payslipsUpdated", loadDashboardData);
    window.addEventListener("leaveRecordsUpdated", loadDashboardData);
    window.addEventListener("companyDetailsUpdated", loadDashboardData);
    window.addEventListener("payCycleSettingsUpdated", loadDashboardData);
    return () => {
      window.removeEventListener("allMockDataUpdated", loadDashboardData);
      window.removeEventListener("employeesUpdated", loadDashboardData);
      window.removeEventListener("payslipsUpdated", loadDashboardData);
      window.removeEventListener("leaveRecordsUpdated", loadDashboardData);
      window.removeEventListener("companyDetailsUpdated", loadDashboardData);
      window.removeEventListener("payCycleSettingsUpdated", loadDashboardData);
    };
  }, [loadDashboardData, companyDetails]);

  if (isLoadingSettings || !visibleWidgets || isLoadingPayslipDesignSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DashboardHeader />

      {visibleWidgets.summaryCards && (
        <DashboardSummaryCards employeeCount={employeeCount} recentPayslipCount={recentPayslipCount} />
      )}

      {visibleWidgets.payrollRunCard && (
        <PayrollRunCard
          employees={employees}
          companyDetails={companyDetails}
          payCycleType={payCycleSettings?.payCycleType ?? "Weekly"}
          cutOffDay={payCycleSettings?.cutOffDay ?? 5}
          payDayOffset={payCycleSettings?.payDayOffset ?? 0}
          runPayrollProcess={runPayrollProcess}
          calculateSinglePayslipPreview={calculateSinglePayslipPreview}
          payslipDesignSettings={payslipDesignSettings}
        />
      )}

      {visibleWidgets.toDoListCard && (
        <ToDoList toDos={toDos} pendingCount={pendingCount} markToDoAsDone={markToDoAsDone} />
      )}

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.monthlyPayrollOverviewChart && (
          <DashboardMonthlyPayrollOverviewChart monthlyPayrollData={monthlyPayrollData} />
        )}

        {visibleWidgets.currentDateCalendar && <DashboardCurrentDateCalendar />}
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.employeeJobTitleDistributionChart && (
          <DashboardEmployeeJobTitleDistributionChart employeeJobTitleData={employeeJobTitleData} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.totalDeductionsBreakdownChart && (
          <DashboardTotalDeductionsBreakdownChart totalDeductionsBreakdown={totalDeductionsBreakdown} />
        )}

        {visibleWidgets.averageNetPayTrendChart && (
          <DashboardAverageNetPayTrendChart averageNetPayTrend={averageNetPayTrend} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.employeeSalaryDistributionChart && (
          <DashboardEmployeeSalaryDistributionChart
            employeeSalaryDistribution={employeeSalaryDistribution}
          />
        )}

        {visibleWidgets.monthlyLeaveDaysTakenChart && (
          <DashboardMonthlyLeaveDaysTakenChart leaveDaysTakenTrend={leaveDaysTakenTrend} />
        )}
      </div>

      {visibleWidgets.quickActionsCard && <DashboardQuickActionsCard />}

      <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on South African Regulations:</h3>
        <p className="text-sm">
          This dashboard provides the user interface for a payroll system. The complex calculations required to meet
          full South African regulations for pay and deductions (such as PAYE, UIF, SDL, etc.) are highly specialized
          and typically handled by a robust backend system. This front-end setup provides the structure for managing
          and displaying payroll data, but the actual calculation logic would need to be implemented on the server-side.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;