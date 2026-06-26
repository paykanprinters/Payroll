"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import AnalyticsHeader from "@/components/analytics/AnalyticsHeader";
import AnalyticsStats from "@/components/analytics/AnalyticsStats";
import AnalyticsChartsGrid from "@/components/analytics/AnalyticsChartsGrid";
import SystemHealthPanel from "@/components/analytics/SystemHealthPanel";
import DatabaseHealthPanel from "@/components/analytics/DatabaseHealthPanel";
import DashboardPeriodFilterBar from "@/components/dashboard/DashboardPeriodFilterBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useAuth } from "@/context/AuthContext";
import { useDatabaseHealth } from "@/hooks/use-database-health";
import { buildSystemHealthReport } from "@/lib/system-health";
import {
  applyAnalyticsPeriod,
  buildAnalyticsAdminSummary,
  computeAnalyticsCharts,
  getAnalyticsScope,
  getChartLimitForPeriod,
} from "@/lib/analytics-metrics";
import type { DashboardChartPeriod } from "@/lib/dashboard-admin-summary";

const PERIOD_LABELS: Record<DashboardChartPeriod, string> = {
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
  all: "All time",
};

interface AnalyticsPageContentProps {
  variant?: "admin" | "staff";
  staffUserId?: string;
}

const AnalyticsPageContent: React.FC<AnalyticsPageContentProps> = ({
  variant = "admin",
  staffUserId,
}) => {
  const { isAuthenticated } = useAuth();
  const {
    employees,
    payslips,
    leaveRecords,
    toDos,
    timesheets,
    companyDetails,
    payCycleSettings,
    userTaxSettings,
    taxTables,
    activeTaxYearForCalculations,
    taxTableValidation,
    isMockDataEnabled,
    isLoadingEmployees,
    isLoadingPayslips,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
  } = usePayrollProcessor();

  const [chartPeriod, setChartPeriod] = useState<DashboardChartPeriod>("12m");
  const [refreshTick, setRefreshTick] = useState(0);

  const isLoadingCore =
    isLoadingEmployees || isLoadingPayslips || isLoadingLeaveRecords || isLoadingTimesheets;

  const baseScope = useMemo(
    () =>
      getAnalyticsScope(employees, payslips, leaveRecords || [], {
        staffUserId: variant === "staff" ? staffUserId : undefined,
      }),
    [employees, payslips, leaveRecords, variant, staffUserId, refreshTick]
  );

  const periodScope = useMemo(
    () => applyAnalyticsPeriod(baseScope, chartPeriod),
    [baseScope, chartPeriod]
  );

  const summary = useMemo(
    () =>
      buildAnalyticsAdminSummary(
        periodScope.employees,
        periodScope.payslips,
        periodScope.leaveRecords
      ),
    [periodScope]
  );

  const chartData = useMemo(
    () =>
      computeAnalyticsCharts(periodScope, {
        limitMonths: getChartLimitForPeriod(chartPeriod),
        includeWorkforceCharts: variant === "admin",
      }),
    [periodScope, chartPeriod, variant]
  );

  const criticalTodoCount = useMemo(
    () => toDos.filter((t) => t.status === "pending" && t.level === "critical").length,
    [toDos]
  );
  const pendingTodoCount = useMemo(
    () => toDos.filter((t) => t.status === "pending").length,
    [toDos]
  );
  const timesheetsAwaitingAction = useMemo(
    () =>
      (timesheets || []).filter((t) => t.status === "Draft" || t.status === "Submitted").length,
    [timesheets]
  );

  const systemHealth = useMemo(
    () =>
      buildSystemHealthReport({
        companyDetails,
        payCycleSettings,
        userTaxSettings,
        taxTables,
        activeTaxYearForCalculations,
        taxTableValidation,
        pendingTodoCount,
        criticalTodoCount,
        timesheetsAwaitingAction,
        employeeCount: baseScope.employees.length,
        payslipCount: baseScope.payslips.length,
        isMockDataEnabled,
        isAuthenticated,
        isCoreDataLoading: isLoadingCore,
      }),
    [
      companyDetails,
      payCycleSettings,
      userTaxSettings,
      taxTables,
      taxTableValidation,
      pendingTodoCount,
      criticalTodoCount,
      timesheetsAwaitingAction,
      baseScope.employees.length,
      baseScope.payslips.length,
      isMockDataEnabled,
      isAuthenticated,
      isLoadingCore,
      activeTaxYearForCalculations,
    ]
  );

  const { report: databaseHealth, isChecking, runCheck } = useDatabaseHealth({
    isMockDataEnabled,
    isAuthenticated,
    enabled: variant === "admin",
  });

  const handleRefresh = () => {
    setRefreshTick((n) => n + 1);
    window.dispatchEvent(new Event("appFocusRefresh"));
    if (variant === "admin") runCheck();
  };

  return (
    <div className="flex flex-col gap-4">
      <AnalyticsHeader
        variant={variant}
        onRefresh={handleRefresh}
        isRefreshing={isLoadingCore || isChecking}
      />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Analytics period</CardTitle>
          <CardDescription>
            KPIs and charts below reflect the selected window
            {variant === "staff" ? " for your records" : " for the organisation"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardPeriodFilterBar period={chartPeriod} onPeriodChange={setChartPeriod} />
        </CardContent>
      </Card>

      {isLoadingCore ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading analytics" />
          <p className="text-sm text-muted-foreground">Loading analytics…</p>
        </div>
      ) : (
        <>
          <AnalyticsStats summary={summary} periodLabel={PERIOD_LABELS[chartPeriod]} />

          {variant === "admin" && (
            <div className="grid items-start gap-4 xl:grid-cols-2">
              <SystemHealthPanel report={systemHealth} />
              <DatabaseHealthPanel
                report={databaseHealth}
                isChecking={isChecking}
                onRefresh={runCheck}
              />
            </div>
          )}

          <Card className="rounded-xl border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {variant === "staff" ? "Personal trends" : "Workforce trends"}
              </CardTitle>
              <CardDescription>
                Visual breakdowns from payslips, earnings, deductions, and leave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary fallbackTitle="Analytics chart error">
                <AnalyticsChartsGrid data={chartData} variant={variant} />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {variant === "staff" ? "About your analytics" : "Using analytics responsibly"}
          </p>
          <p className="mt-2">
            {variant === "staff" ? (
              <>
                These charts reflect <strong>your payslips and leave only</strong>. For statutory
                filings and company-wide totals, contact your payroll administrator.
              </>
            ) : (
              <>
                Use analytics to spot cost drift, overtime spikes, and leave patterns before payroll
                runs. Cross-check <strong>system health</strong> and <strong>database probes</strong>{" "}
                after deployments or migrations. For exportable registers and statutory reports, open{" "}
                <strong>Reports</strong>. Tax year {activeTaxYearForCalculations} applies to
                statutory calculations.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPageContent;
