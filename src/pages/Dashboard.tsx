"use client";

import React, { useState, useEffect } from "react";
import { useDashboardSettings } from "@/hooks/use-dashboard-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    setEmployeeCount(employees.length);
    setRecentPayslipCount(payslips.length);

    const jobTitleMap = new Map<string, number>();
    employees.forEach((emp) => {
      jobTitleMap.set(emp.jobTitle, (jobTitleMap.get(emp.jobTitle) || 0) + 1);
    });
    setEmployeeJobTitleData(
      Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value }))
    );

    const monthlyGrossPayMap = new Map<string, number>();
    payslips.forEach(p => {
      const monthYear = p.payPeriod.substring(0, 7);
      monthlyGrossPayMap.set(monthYear, (monthlyGrossPayMap.get(monthYear) || 0) + p.grossEarnings);
    });
    const sortedMonthlyPayrollData = Array.from(monthlyGrossPayMap.entries())
      .map(([monthYear, payroll]) => ({
        name: format(new Date(monthYear), 'MMM yyyy'),
        payroll: payroll,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setMonthlyPayrollData(sortedMonthlyPayrollData);

    const deductionsMap = new Map<string, number>();
    payslips.forEach(p => {
      p.deductionsBreakdown.forEach(deduction => {
        deductionsMap.set(deduction.name, (deductionsMap.get(deduction.name) || 0) + deduction.amount);
      });
    });
    setTotalDeductionsBreakdown(
      Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }))
    );

    const monthlyNetPayMap = new Map<string, { totalNetPay: number; employeeCount: number }>();
    payslips.forEach(p => {
      const monthYear = p.payPeriod.substring(0, 7);
      const current = monthlyNetPayMap.get(monthYear) || { totalNetPay: 0, employeeCount: 0 };
      monthlyNetPayMap.set(monthYear, {
        totalNetPay: current.totalNetPay + p.netPay,
        employeeCount: current.employeeCount + 1,
      });
    });
    const sortedAverageNetPay = Array.from(monthlyNetPayMap.entries())
      .map(([monthYear, data]) => ({
        name: new Date(monthYear).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        avgNetPay: data.employeeCount > 0 ? data.totalNetPay / data.employeeCount : 0,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setAverageNetPayTrend(sortedAverageNetPay);

    const salaryRanges = [
      { range: "R0 - R20k", min: 0, max: 20000, count: 0 },
      { range: "R20k - R40k", min: 20001, max: 40000, count: 0 },
      { range: "R40k - R60k", min: 40001, max: 60000, count: 0 },
      { range: "R60k+", min: 60001, max: Infinity, count: 0 },
    ];
    employees.forEach(emp => {
      for (const range of salaryRanges) {
        if ((emp.salary || 0) >= range.min && (emp.salary || 0) <= range.max) {
          range.count++;
          break;
        }
      }
    });
    setEmployeeSalaryDistribution(salaryRanges.map(r => ({ range: r.range, count: r.count })));

    const monthlyLeaveDaysMap = new Map<string, number>();
    leaveRecords.forEach(record => {
      const monthYear = record.startDate.substring(0, 7);
      monthlyLeaveDaysMap.set(monthYear, (monthlyLeaveDaysMap.get(monthYear) || 0) + record.workingDays);
    });
    const sortedLeaveDaysTrend = Array.from(monthlyLeaveDaysMap.entries())
      .map(([monthYear, days]) => ({
        name: new Date(monthYear).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        days: days,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setLeaveDaysTakenTrend(sortedLeaveDaysTrend);

  }, [employees, payslips, leaveRecords, payCycleSettings, calculateSinglePayslipPreview]);

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('allMockDataUpdated', loadDashboardData);
    window.addEventListener('employeesUpdated', loadDashboardData);
    window.addEventListener('payslipsUpdated', loadDashboardData);
    window.addEventListener('leaveRecordsUpdated', loadDashboardData);
    window.addEventListener('companyDetailsUpdated', loadDashboardData);
    window.addEventListener('payCycleSettingsUpdated', loadDashboardData);
    return () => {
      window.removeEventListener('allMockDataUpdated', loadDashboardData);
      window.removeEventListener('employeesUpdated', loadDashboardData);
      window.removeEventListener('payslipsUpdated', loadDashboardData);
      window.removeEventListener('leaveRecordsUpdated', loadDashboardData);
      window.removeEventListener('companyDetailsUpdated', loadDashboardData);
      window.removeEventListener('payCycleSettingsUpdated', loadDashboardData);
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
        <DashboardSummaryCards
          employeeCount={employeeCount}
          recentPayslipCount={recentPayslipCount}
        />
      )}

      {visibleWidgets.payrollRunCard && (
        <PayrollRunCard
          employees={employees}
          companyDetails={companyDetails}
          payCycleType={payCycleSettings?.payCycleType ?? 'Weekly'}
          cutOffDay={payCycleSettings?.cutOffDay ?? 5}
          payDayOffset={payCycleSettings?.payDayOffset ?? 0}
          runPayrollProcess={runPayrollProcess}
          calculateSinglePayslipPreview={calculateSinglePayslipPreview}
          payslipDesignSettings={payslipDesignSettings}
        />
      )}

      {visibleWidgets.toDoListCard && <ToDoList toDos={toDos} pendingCount={pendingCount} markToDoAsDone={markToDoAsDone} />}

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {visibleWidgets.monthlyPayrollOverviewChart && (
          <DashboardMonthlyPayrollOverviewChart monthlyPayrollData={monthlyPayrollData} />
        )}

        {visibleWidgets.currentDateCalendar && (
          <DashboardCurrentDateCalendar />
        )}
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
          <DashboardEmployeeSalaryDistributionChart employeeSalaryDistribution={employeeSalaryDistribution} />
        )}

        {visibleWidgets.monthlyLeaveDaysTakenChart && (
          <DashboardMonthlyLeaveDaysTakenChart leaveDaysTakenTrend={leaveDaysTakenTrend} />
        )}
      </div>

      {visibleWidgets.quickActionsCard && (
        <DashboardQuickActionsCard />
      )}

      <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on South African Regulations:</h3>
        <p className="text-sm">
          This dashboard provides the user interface for a payroll system. The complex calculations required to meet full South African regulations for pay and deductions (such as PAYE, UIF, SDL, etc.) are highly specialized and typically handled by a robust backend system. This front-end setup provides the structure for managing and displaying payroll data, but the actual calculation logic would need to be implemented on the server-side.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;