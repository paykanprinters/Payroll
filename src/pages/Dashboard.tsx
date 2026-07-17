"use client";

import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { usePayrollProcessor } from "@/context/PayrollDataContext";
import RetroFunkHeader from "@/components/dashboard/RetroFunkHeader";
import DashboardPrimaryActions from "@/components/dashboard/DashboardPrimaryActions";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";
import SetupHealthSummaryCard from "@/components/dashboard/SetupHealthSummaryCard";
import DashboardPeriodFilterBar from "@/components/dashboard/DashboardPeriodFilterBar";
import PayrollRunCard from "@/components/payroll/PayrollRunCard";
import ToDoList from "@/components/ToDoList";
import ErrorBoundary from "@/components/ErrorBoundary";

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

import { useDashboardSettings, type DashboardWidgetKey } from "@/hooks/use-dashboard-settings";
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
import {
  buildDashboardAdminSummary,
  filterPayslipsByChartPeriod,
  type DashboardChartPeriod,
} from "@/lib/dashboard-admin-summary";

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
    taxTables,
    userTaxSettings,
    activeTaxYearForCalculations,
    taxTableValidation,
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
  const {
    visibleWidgets,
    isLoadingSettings,
    getSectionOrder,
    moveWidget,
    toggleWidgetVisibility,
    resetToDefaults,
  } = useDashboardSettings({ isMockDataEnabled });

  const [chartPeriod, setChartPeriod] = useState<DashboardChartPeriod>("12m");

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

  const pendingTodoCount = useMemo(
    () => toDos.filter((t) => t.status === "pending").length,
    [toDos]
  );

  const summary = useMemo(
    () =>
      buildDashboardAdminSummary({
        employeeCount: employees.length,
        payslips,
        pendingTodoCount,
        timesheets: timesheets || [],
        companyDetails,
        payCycleSettings,
        userTaxSettings,
        taxTables,
        activeTaxYearForCalculations,
        taxTableValidation,
      }),
    [
      employees.length,
      payslips,
      pendingTodoCount,
      timesheets,
      companyDetails,
      payCycleSettings,
      userTaxSettings,
      taxTables,
      activeTaxYearForCalculations,
      taxTableValidation,
    ]
  );

  const filteredPayslipsForCharts = useMemo(
    () => filterPayslipsByChartPeriod(payslips, chartPeriod),
    [payslips, chartPeriod]
  );

  const chartLimit = chartPeriod === "3m" ? 3 : chartPeriod === "6m" ? 6 : 12;

  const monthlyPayrollData = useMemo(
    () => computeMonthlyPayrollData(filteredPayslipsForCharts, { limit: chartLimit }),
    [filteredPayslipsForCharts, chartLimit]
  );
  const avgNetPayTrend = useMemo(
    () => computeAverageNetPayTrend(filteredPayslipsForCharts, { limit: chartLimit }),
    [filteredPayslipsForCharts, chartLimit]
  );
  const deductionsBreakdown = useMemo(
    () => computeDeductionsBreakdown(filteredPayslipsForCharts, { top: 7 }),
    [filteredPayslipsForCharts]
  );
  const jobTitleDist = useMemo(() => computeJobTitleDistribution(employees, { top: 7 }), [employees]);
  const salaryDist = useMemo(() => computeSalaryDistribution(employees), [employees]);
  const leaveDaysTrend = useMemo(
    () => computeLeaveDaysTakenTrend(leaveRecords || [], { limit: chartLimit }),
    [leaveRecords, chartLimit]
  );
  const timesheetStatus = useMemo(
    () => computeTimesheetStatusCounts(timesheets || []),
    [timesheets]
  );
  const savingsStatus = useMemo(
    () => computeSavingsStatusSummary(payrollSavingsEntries || []),
    [payrollSavingsEntries]
  );
  const loansOverview = useMemo(() => computeLoansOverview(loans || []), [loans]);

  const mainOrder = useMemo(() => getSectionOrder("main"), [getSectionOrder]);
  const sideOrder = useMemo(() => getSectionOrder("side"), [getSectionOrder]);
  const chartsOrder = useMemo(() => getSectionOrder("charts"), [getSectionOrder]);

  const hasVisibleCharts = useMemo(
    () => chartsOrder.some((k) => visibleWidgets?.[k]),
    [chartsOrder, visibleWidgets]
  );

  const renderWidget = (key: DashboardWidgetKey) => {
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
        return (
          <DashboardTotalDeductionsBreakdownChart totalDeductionsBreakdown={deductionsBreakdown} />
        );
      case "employeeJobTitleDistributionChart":
        return <DashboardEmployeeJobTitleDistributionChart employeeJobTitleData={jobTitleDist} />;
      case "employeeSalaryDistributionChart":
        return (
          <DashboardEmployeeSalaryDistributionChart employeeSalaryDistribution={salaryDist} />
        );
      case "monthlyLeaveDaysTakenChart":
        return <DashboardMonthlyLeaveDaysTakenChart leaveDaysTakenTrend={leaveDaysTrend} />;

      default:
        return null;
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading dashboard" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RetroFunkHeader
        companyLegalName={
          companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company"
        }
        isMockDataEnabled={isMockDataEnabled}
        visibleWidgets={visibleWidgets}
        isLoadingSettings={isLoadingSettings}
        getSectionOrder={getSectionOrder}
        moveWidget={moveWidget}
        toggleWidgetVisibility={toggleWidgetVisibility}
        resetToDefaults={resetToDefaults}
      />

      {visibleWidgets?.quickActionsCard !== false && <DashboardPrimaryActions />}

      {visibleWidgets?.summaryCards && (
        <DashboardSummaryCards
          summary={summary}
          showUpcomingPayrollCard={!!visibleWidgets.upcomingPayrollCard}
        />
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-4 lg:col-span-7">
          <ErrorBoundary fallbackTitle="Dashboard panel error">
            {mainOrder.map((k) => (
              <React.Fragment key={k}>{renderWidget(k)}</React.Fragment>
            ))}
          </ErrorBoundary>
        </div>

        <div className="space-y-4 lg:col-span-5">
          <SetupHealthSummaryCard />

          <ErrorBoundary fallbackTitle="Dashboard sidebar error">
            {sideOrder.map((k) => (
              <React.Fragment key={k}>{renderWidget(k)}</React.Fragment>
            ))}
          </ErrorBoundary>
        </div>
      </div>

      {hasVisibleCharts && (
        <Card className="rounded-xl border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workforce analytics</CardTitle>
            <CardDescription>
              Trends from payslips and leave records. Operational widgets above use live counts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DashboardPeriodFilterBar period={chartPeriod} onPeriodChange={setChartPeriod} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {chartsOrder.map((k) => (
                <React.Fragment key={k}>{renderWidget(k)}</React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Payroll workflow</p>
          <p className="mt-2">
            Resolve <strong>open tasks</strong> and <strong>setup status</strong> first, then approve
            timesheets and record leave before running payroll. Use <strong>Customize layout</strong> to
            show only the widgets your role needs. Analytics charts respect the selected period; tax year{" "}
            {activeTaxYearForCalculations} applies to statutory calculations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
