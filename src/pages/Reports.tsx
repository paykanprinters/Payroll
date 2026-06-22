"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ReportsPeriodBar from "@/components/reports/ReportsPeriodBar";
import ReportsStats from "@/components/reports/ReportsStats";
import ReportsCatalog from "@/components/reports/ReportsCatalog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useReportDesignSettings } from "@/hooks/use-report-design-settings";
import {
  buildReportsAdminSummary,
  filterLeaveForReportPeriod,
  filterPayslipsForReportPeriod,
  getReportPeriodLabel,
  type ReportAuditLevel,
  type ReportPeriodType,
} from "@/lib/reports-admin-summary";

const Reports: React.FC = () => {
  const {
    employees,
    payslips,
    leaveRecords,
    companyDetails,
    isLoadingEmployees,
    isLoadingPayslips,
    isLoadingLeaveRecords,
    isMockDataEnabled,
    activeTaxYearForCalculations,
  } = usePayrollProcessor();

  const { settings: reportDesignSettings } = useReportDesignSettings();

  const [selectedReportDate, setSelectedReportDate] = useState<Date | undefined>(new Date());
  const [reportPeriodType, setReportPeriodType] = useState<ReportPeriodType>("monthly");
  const [auditLevel, setAuditLevel] = useState<ReportAuditLevel>("standard");
  const [refreshTick, setRefreshTick] = useState(0);

  const isLoading = isLoadingEmployees || isLoadingPayslips || isLoadingLeaveRecords;

  const periodPayslips = useMemo(
    () => filterPayslipsForReportPeriod(payslips, selectedReportDate, reportPeriodType),
    [payslips, selectedReportDate, reportPeriodType, refreshTick]
  );

  const periodLeave = useMemo(
    () => filterLeaveForReportPeriod(leaveRecords || [], selectedReportDate, reportPeriodType),
    [leaveRecords, selectedReportDate, reportPeriodType, refreshTick]
  );

  const summary = useMemo(() => buildReportsAdminSummary(periodPayslips), [periodPayslips]);
  const periodLabel = getReportPeriodLabel(selectedReportDate, reportPeriodType);

  const handleRefresh = () => {
    setRefreshTick((n) => n + 1);
    window.dispatchEvent(new Event("appFocusRefresh"));
  };

  return (
    <div className="flex flex-col gap-4">
      <ReportsHeader onRefresh={handleRefresh} isRefreshing={isLoading} />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reporting period</CardTitle>
          <CardDescription>
            All reports and KPIs use the selected month or year. Payroll summary detail level applies
            to the summary report only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsPeriodBar
            periodType={reportPeriodType}
            onPeriodTypeChange={setReportPeriodType}
            selectedDate={selectedReportDate}
            onSelectedDateChange={setSelectedReportDate}
            auditLevel={auditLevel}
            onAuditLevelChange={setAuditLevel}
            periodLabel={periodLabel}
            payslipCount={summary.payslipCount}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading reports data" />
          <p className="text-sm text-muted-foreground">Loading report data…</p>
        </div>
      ) : (
        <>
          <ReportsStats summary={summary} periodLabel={periodLabel} />

          <ErrorBoundary fallbackTitle="Reports catalog error">
            <ReportsCatalog
              employees={employees}
              payslips={periodPayslips}
              leaveRecords={periodLeave}
              companyDetails={companyDetails}
              reportDesignSettings={reportDesignSettings}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
              auditLevel={auditLevel}
              periodPayslipCount={summary.payslipCount}
            />
          </ErrorBoundary>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Report workflow</p>
          <p className="mt-2">
            Select the correct <strong>reporting period</strong> first, then generate registers from
            posted payslips. Use <strong>detailed payroll summary</strong> for reconciliations; use{" "}
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
