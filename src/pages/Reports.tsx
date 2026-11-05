"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ReportsPeriodBar from "@/components/reports/ReportsPeriodBar";
import ReportsStats from "@/components/reports/ReportsStats";
import ReportsCatalog from "@/components/reports/ReportsCatalog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useReportDesignSettings } from "@/hooks/use-report-design-settings";
import { useReportPeriod } from "@/hooks/use-report-period";
import { useInitialLoading } from "@/hooks/use-initial-loading";

const Reports: React.FC = () => {
  const {
    employees,
    payslips,
    timesheets,
    companyDetails,
    isLoadingEmployees,
    isLoadingPayslips,
    isLoadingLeaveRecords,
    isLoadingTimesheets,
    isMockDataEnabled,
    activeTaxYearForCalculations,
  } = usePayrollProcessor();

  const { settings: reportDesignSettings } = useReportDesignSettings();
  const period = useReportPeriod();

  const isLoading =
    isLoadingEmployees || isLoadingPayslips || isLoadingLeaveRecords || isLoadingTimesheets;
  const isInitialLoading = useInitialLoading(isLoading);

  return (
    <div className="flex flex-col gap-4">
      <ReportsHeader onRefresh={period.refresh} isRefreshing={isLoading} />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reporting period</CardTitle>
          <CardDescription>
            All reports and KPIs use the selected pay week, month or year. The weekly view lists only
            reports that support a single pay week. Payroll summary detail level applies to the summary
            report only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsPeriodBar
            periodType={period.reportPeriodType}
            onPeriodTypeChange={period.setReportPeriodType}
            selectedDate={period.selectedReportDate}
            onSelectedDateChange={period.setSelectedReportDate}
            auditLevel={period.auditLevel}
            onAuditLevelChange={period.setAuditLevel}
            periodLabel={period.periodLabel}
            payslipCount={period.summary.payslipCount}
            payWeeks={period.payWeeks}
          />
        </CardContent>
      </Card>

      {isInitialLoading ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading reports data" />
          <p className="text-sm text-muted-foreground">Loading report data…</p>
        </div>
      ) : (
        <>
          <ReportsStats summary={period.summary} periodLabel={period.periodLabel} />

          <ErrorBoundary fallbackTitle="Reports catalog error">
            <ReportsCatalog
              employees={employees}
              payslips={period.periodPayslips}
              allPayslips={payslips}
              leaveRecords={period.periodLeave}
              timesheets={timesheets}
              companyDetails={companyDetails}
              reportDesignSettings={reportDesignSettings}
              selectedReportDate={period.selectedReportDate}
              reportPeriodType={period.reportPeriodType}
              auditLevel={period.auditLevel}
              periodPayslipCount={period.summary.payslipCount}
              auditLogs={period.auditLogs}
              isMockDataEnabled={isMockDataEnabled}
            />
          </ErrorBoundary>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Report workflow</p>
          <p className="mt-2">
            Select the correct <strong>reporting period</strong> first. Use{" "}
            <strong>payroll readiness</strong> for a stakeholder checklist of missing employee,
            company, and timesheet items before cut-off. Then generate registers from posted
            payslips. Use <strong>detailed payroll summary</strong> for reconciliations; use{" "}
            <strong>bank transfer schedule</strong> only for authorised payroll staff. Statutory
            reports should be checked against source payslips before SARS submission (tax year{" "}
            {activeTaxYearForCalculations}).
            {isMockDataEnabled && (
              <>
                {" "}
                Mock mode is active — report figures reflect sample data, not live Supabase records.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
