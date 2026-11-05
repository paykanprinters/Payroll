"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear } from "date-fns";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { fetchAuditLogs } from "@/integrations/supabase/audit-queries";
import {
  buildReportsAdminSummary,
  filterLeaveForReportPeriod,
  filterPayslipsForReportPeriod,
  getReportPeriodLabel,
  listPayWeeks,
  payWeekForDate,
  type ReportAuditLevel,
  type ReportPeriodType,
} from "@/lib/reports-admin-summary";

/** Reporting period selection plus the payslips, leave and audit logs that fall inside it. */
export function useReportPeriod() {
  const { payslips, leaveRecords, isMockDataEnabled } = usePayrollProcessor();

  const [searchParams] = useSearchParams();
  const initialWeek = searchParams.get("period") === "weekly" ? searchParams.get("date") : null;
  const [selectedReportDate, setSelectedReportDate] = useState<Date | undefined>(() =>
    initialWeek ? parseISO(initialWeek) : new Date()
  );
  const [reportPeriodType, setReportPeriodType] = useState<ReportPeriodType>(
    initialWeek ? "weekly" : "monthly"
  );
  const payWeeks = useMemo(() => listPayWeeks(payslips), [payslips]);
  const selectedPayWeek = useMemo(
    () => (selectedReportDate ? payWeekForDate(payslips, selectedReportDate) : null),
    [payslips, selectedReportDate]
  );

  useEffect(() => {
    if (reportPeriodType === "weekly" && !selectedPayWeek && payWeeks.length > 0) {
      setSelectedReportDate(parseISO(payWeeks[0].start));
    }
  }, [reportPeriodType, selectedPayWeek, payWeeks]);

  const [auditLevel, setAuditLevel] = useState<ReportAuditLevel>("standard");
  const [refreshTick, setRefreshTick] = useState(0);
  const [auditLogs, setAuditLogs] = useState<Awaited<ReturnType<typeof fetchAuditLogs>>>([]);

  useEffect(() => {
    if (isMockDataEnabled) {
      setAuditLogs([]);
      return;
    }
    const load = async () => {
      const filters: Parameters<typeof fetchAuditLogs>[0] = { limit: 500 };
      if (selectedReportDate && reportPeriodType === "weekly") {
        const day = format(selectedReportDate, "yyyy-MM-dd");
        filters.dateStart = selectedPayWeek?.start ?? day;
        filters.dateEnd = selectedPayWeek?.end ?? day;
      } else if (selectedReportDate) {
        const start =
          reportPeriodType === "monthly"
            ? startOfMonth(selectedReportDate)
            : startOfYear(selectedReportDate);
        const end =
          reportPeriodType === "monthly"
            ? endOfMonth(selectedReportDate)
            : endOfYear(selectedReportDate);
        filters.dateStart = format(start, "yyyy-MM-dd");
        filters.dateEnd = format(end, "yyyy-MM-dd");
      }
      setAuditLogs(await fetchAuditLogs(filters));
    };
    void load();
  }, [isMockDataEnabled, selectedReportDate, reportPeriodType, selectedPayWeek, refreshTick]);

  const periodPayslips = useMemo(
    () => filterPayslipsForReportPeriod(payslips, selectedReportDate, reportPeriodType),
    [payslips, selectedReportDate, reportPeriodType]
  );

  const periodLeave = useMemo(
    () =>
      filterLeaveForReportPeriod(leaveRecords || [], selectedReportDate, reportPeriodType, selectedPayWeek),
    [leaveRecords, selectedReportDate, reportPeriodType, selectedPayWeek]
  );

  const summary = useMemo(() => buildReportsAdminSummary(periodPayslips), [periodPayslips]);
  const periodLabel = getReportPeriodLabel(selectedReportDate, reportPeriodType, payslips);

  const refresh = () => {
    setRefreshTick((n) => n + 1);
    window.dispatchEvent(new Event("appFocusRefresh"));
  };

  return {
    selectedReportDate,
    setSelectedReportDate,
    reportPeriodType,
    setReportPeriodType,
    payWeeks,
    auditLevel,
    setAuditLevel,
    auditLogs,
    periodPayslips,
    periodLeave,
    summary,
    periodLabel,
    refresh,
  };
}
