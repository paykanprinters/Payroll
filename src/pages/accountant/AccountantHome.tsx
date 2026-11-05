"use client";

import React from "react";
import { Briefcase, Eye, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";
import KanPageBanner from "@/components/KanPageBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import ReportsPeriodBar from "@/components/reports/ReportsPeriodBar";
import ReportsStats from "@/components/reports/ReportsStats";
import ReportsCatalog from "@/components/reports/ReportsCatalog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useReportDesignSettings } from "@/hooks/use-report-design-settings";
import { useReportPeriod } from "@/hooks/use-report-period";

const AccountantHome: React.FC = () => {
  const { user } = useAuth();
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
  } = usePayrollProcessor();
  const { settings: reportDesignSettings } = useReportDesignSettings();
  const period = useReportPeriod();

  const isLoading =
    isLoadingEmployees || isLoadingPayslips || isLoadingLeaveRecords || isLoadingTimesheets;
  const isAccountant = user?.role === "Accountant";
  const companyName =
    companyDetails?.companyTradingName || companyDetails?.companyLegalName || "the company";
  const accessUntil = user?.accessExpiresAt
    ? new Date(user.accessExpiresAt).toLocaleDateString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <KanPageBanner
        icon={Briefcase}
        title="Accountant portal"
        description={`Payroll records for ${companyName}: ledgers, statutory returns, registers and audit evidence.`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={period.refresh}
            disabled={isLoading}
            className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh data
          </Button>
        }
      />

      {isAccountant ? (
        <Alert className="border-sky-200 bg-sky-50 text-sky-950">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            You can view, print and download reports. Nothing can be changed from this login, and each
            report you open or download is recorded in the audit log.{" "}
            {accessUntil ? (
              <>
                Your access runs until <strong>{accessUntil}</strong>.
              </>
            ) : (
              <>Your access has no end date set.</>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <Eye className="h-4 w-4" />
          <AlertTitle>Preview</AlertTitle>
          <AlertDescription>
            This is the page an Accountant login lands on. Add or manage Accountant logins under
            Settings → User control panel.
          </AlertDescription>
        </Alert>
      )}

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reporting period</CardTitle>
          <CardDescription>
            Choose a pay week, month or SARS tax year. Every report below uses this period.
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

      {isLoading ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading reports data" />
          <p className="text-sm text-muted-foreground">Loading payroll records…</p>
        </div>
      ) : (
        <>
          <ReportsStats summary={period.summary} periodLabel={period.periodLabel} />
          <ErrorBoundary fallbackTitle="Accountant reports error">
            <ReportsCatalog
              variant="accountant"
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
          <p className="font-medium text-foreground">Where to find things</p>
          <p className="mt-2">
            <strong>Payroll &amp; ledgers</strong> has the payroll journal, registers and loan and
            savings balances. <strong>Statutory &amp; tax</strong> has EMP201, EMP501, IRP5 and the
            per-employee deductions file. <strong>Evidence &amp; controls</strong> shows who approved each
            payroll run, changes to employee and company records, and who has access to the system.
            Individual payslips are under <strong>Payslips</strong> in the menu.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountantHome;
