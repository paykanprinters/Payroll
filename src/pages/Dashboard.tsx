"use client";

import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import RetroFunkHeader from "@/components/dashboard/RetroFunkHeader";
import DashboardPrimaryActions from "@/components/dashboard/DashboardPrimaryActions";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";
import SetupHealthSummaryCard from "@/components/dashboard/SetupHealthSummaryCard";
import PayrollRunCard from "@/components/payroll/PayrollRunCard";
import ToDoList from "@/components/ToDoList";

import DashboardMonthlyPayrollOverviewChart from "@/components/dashboard/DashboardMonthlyPayrollOverviewChart";
import DashboardTotalDeductionsBreakdownChart from "@/components/dashboard/DashboardTotalDeductionsBreakdownChart";
import DashboardAverageNetPayTrendChart from "@/components/dashboard/DashboardAverageNetPayTrendChart";
import DashboardEmployeeJobTitleDistributionChart from "@/components/dashboard/DashboardEmployeeJobTitleDistributionChart";
import DashboardEmployeeSalaryDistributionChart from "@/components/dashboard/DashboardEmployeeSalaryDistributionChart";
import DashboardMonthlyLeaveDaysTakenChart from "@/components/dashboard/DashboardMonthlyLeaveDaysTakenChart";
import DashboardCurrentDateCalendar from "@/components/dashboard/DashboardCurrentDateCalendar";
import DashboardTimesheetStatusChart from "@/components/dashboard/DashboardTimesheetStatusChart";
import DashboardSavingsStatusChart from "@/components/dashboard/DashboardSavingsStatusChart";
import DashboardLoansOverviewCard from "@/components/dashboard/DashboardLoansOverviewCard";

import { useDashboardSettings } from "@/hooks/use-dashboard-settings";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";

import {
  computeAverageNetPayTrend,
  computeDeductionsBreakdown,
  computeJobTitleDistribution,
  computeLeaveDaysTakenTrend,
  computeLoansOverview,
  computeMonthlyPayrollData,
  computeSalaryDistribution,
  computeSavingsStatusSummary,
  computeTimesheetStatusCounts,
} from "@/lib/dashboard-metrics";

const Dashboard: React.FC = () => {
  const {
    employees,
    payslips,
    leaveRecords,
    timesheets,
    toDos,
    pendingCount,
    loans,
    payrollSavingsEntries,
    companyDetails,
    payCycleSettings,
    runPayrollProcess,
    calculateSinglePayslipPreview,
    markToDoAsDone,
    isLoadingCompanyDetails,
    isLoadingEmployees,
    isLoadingPayCycleSettings,
    isLoadingPayslips,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
    isLoadingToDos,
    isLoadingLoans,
    isLoadingPayrollSavingsEntries,
    isMockDataEnabled,
  } = usePayrollProcessor();

  const { settings: payslipDesignSettings, isLoading: isLoadingPayslipDesign } = usePayslipDesignSettings();
  const { visibleWidgets, isLoadingSettings, getSectionOrder } = useDashboardSettings({ isMockDataEnabled });

  const isLoadingPage =
    isLoadingCompanyDetails ||
    isLoadingEmployees ||
    isLoadingPayCycleSettings ||
    isLoadingPayslips ||
    isLoadingLeaveRecords ||
    isLoadingTimesheets ||
    isLoadingToDos ||
    isLoadingLoans ||
    isLoadingPayrollSavingsEntries ||
    isLoadingPayslipDesign ||
    isLoadingSettings;

  const monthlyPayrollData = useMemo(() => computeMonthlyPayrollData(payslips, { limit: 12 }), [payslips]);
  const avgNetPayTrend = useMemo(() => computeAverageNetPayTrend(payslips, { limit: 12 }), [payslips]);
  const deductionsBreakdown = useMemo(() => computeDeductionsBreakdown(payslips, { top: 7 }), [payslips]);
  const jobTitleDist = useMemo(() => computeJobTitleDistribution(employees, { top: 7 }), [employees]);
  const salaryDist = useMemo(() => computeSalaryDistribution(employees), [employees]);
  const leaveDaysTrend = useMemo(
    () => computeLeaveDaysTakenTrend(leaveRecords || [], { limit: 12 }),
    [leaveRecords]
  );
  const timesheetStatus = useMemo(() => computeTimesheetStatusCounts(timesheets || []), [timesheets]);
  const savingsStatus = useMemo(
    () => computeSavingsStatusSummary(payrollSavingsEntries || []),
    [payrollSavingsEntries]
  );
  const loansOverview = useMemo(() => computeLoansOverview(loans || []), [loans]);

  const mainOrder = useMemo(() => getSectionOrder("main"), [getSectionOrder]);
  const sideOrder = useMemo(() => getSectionOrder("side"), [getSectionOrder]);
  const chartsOrder = useMemo(() => getSectionOrder("charts"), [getSectionOrder]);

  const renderWidget = (key: keyof typeof visibleWidgets) => {
    if (!visibleWidgets || !visibleWidgets[key]) return null;

    switch (key) {
      case "toDoListCard":
        return (
          <ToDoList
            toDos={toDos}
            pendingCount={pendingCount}
            markToDoAsDone={markToDoAsDone}
          />
        );
      case "timesheetStatusChart":
        return <DashboardTimesheetStatusChart statusCounts={timesheetStatus.chartData} />;
      case "loansOverviewCard":
        return (
          <DashboardLoansOverviewCard
            activeCount={loansOverview.activeCount}
            totalLoanAmount={loansOverview.totalLoanAmount}
            totalRemaining={loansOverview.totalRemaining}
            repaidPct={loansOverview.repaidPct}
          />
        );
      case "payrollRunCard":
        return companyDetails && payCycleSettings ? (
          <PayrollRunCard
            employees={employees}
            companyDetails={companyDetails}
            payCycleType={payCycleSettings.payCycleType}
            cutOffDay={payCycleSettings.cutOffDay}
            payDayOffset={payCycleSettings.payDayOffset}
            runPayrollProcess={runPayrollProcess}
            calculateSinglePayslipPreview={calculateSinglePayslipPreview}
            payslipDesignSettings={payslipDesignSettings}
          />
        ) : null;
      case "savingsStatusChart":
        return <DashboardSavingsStatusChart data={savingsStatus.chartData} />;
      case "currentDateCalendar":
        return <DashboardCurrentDateCalendar />;

      case "monthlyPayrollOverviewChart":
        return <DashboardMonthlyPayrollOverviewChart monthlyPayrollData={monthlyPayrollData} />;
      case "averageNetPayTrendChart":
        return <DashboardAverageNetPayTrendChart averageNetPayTrend={avgNetPayTrend} />;
      case "totalDeductionsBreakdownChart":
        return <DashboardTotalDeductionsBreakdownChart totalDeductionsBreakdown={deductionsBreakdown} />;
      case "employeeJobTitleDistributionChart":
        return <DashboardEmployeeJobTitleDistributionChart employeeJobTitleData={jobTitleDist} />;
      case "employeeSalaryDistributionChart":
        return <DashboardEmployeeSalaryDistributionChart employeeSalaryDistribution={salaryDist} />;
      case "monthlyLeaveDaysTakenChart":
        return <DashboardMonthlyLeaveDaysTakenChart leaveDaysTakenTrend={leaveDaysTrend} />;

      default:
        return null;
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RetroFunkHeader />

      <DashboardPrimaryActions />

      {visibleWidgets?.summaryCards && (
        <DashboardSummaryCards
          employeeCount={employees.length}
          recentPayslipCount={payslips.length}
          showUpcomingPayrollCard={!!visibleWidgets.upcomingPayrollCard}
        />
      )}

      <div className="grid items-start gap-6 md:grid-cols-12">
        <div className="md:col-span-7 space-y-6">
          {mainOrder.map((k) => (
            <React.Fragment key={k}>{renderWidget(k)}</React.Fragment>
          ))}
        </div>

        <div className="md:col-span-5 space-y-6">
          <SetupHealthSummaryCard />

          {sideOrder.map((k) => (
            <React.Fragment key={k}>{renderWidget(k)}</React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {chartsOrder.map((k) => (
          <React.Fragment key={k}>{renderWidget(k)}</React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;