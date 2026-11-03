"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Loader2, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useAuth } from "@/hooks/use-auth";
import { showError, showSuccess } from "@/utils/toast";
import type { ClosurePayWeek, CompanyClosure } from "@/lib/company-closure";
import { calendarDateFromIso, payslipsForPayrollPeriod } from "@/lib/payroll-period-guard";
import {
  createPayrollRun,
  fetchPayrollRuns,
  replaceRunItems,
  type PayrollRun,
} from "@/integrations/supabase/payroll-run-queries";
import { fetchPayslipsFromSupabase } from "@/integrations/supabase/payslip-queries";
import { insertAuditLog } from "@/integrations/supabase/audit-queries";

const formatDay = (iso: string) => format(parseISO(iso), "EEE d MMM");

const ClosurePayoutPanel: React.FC<{ closure: CompanyClosure; weeks: ClosurePayWeek[] }> = ({ closure, weeks }) => {
  const { user } = useAuth();
  const { payslips, runPayrollProcess, refetchPayslips, payCycleSettings } = usePayrollProcessor();
  const canProcess = user?.role === "Admin" || user?.role === "Manager";
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRuns = useCallback(async () => setRuns(await fetchPayrollRuns()), []);
  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const advanceWeeks = useMemo(() => weeks.filter((w) => w.paidInAdvance), [weeks]);

  const weekStatus = (week: ClosurePayWeek) => {
    const existing = payslipsForPayrollPeriod(payslips, calendarDateFromIso(week.start), calendarDateFromIso(week.end));
    const run = runs.find((r) => r.periodStart === week.start && r.periodEnd === week.end && r.status !== "Cancelled");
    const paidByClosure = existing.length > 0 && existing.every((p) => p.paidInAdvanceClosureId === closure.id);
    return { existing, run, paidByClosure };
  };

  const processWeek = async (week: ClosurePayWeek) => {
    const { existing, run: existingRun } = weekStatus(week);
    if (existingRun && existingRun.status !== "Draft") {
      showError(`The payroll run for this week is already ${existingRun.status}. Open the run to make changes.`);
      return;
    }
    const replaceExisting = existing.length > 0;
    if (
      replaceExisting &&
      !window.confirm(
        `${existing.length} payslip(s) already exist for ${formatDay(week.start)} – ${formatDay(week.end)}. Replace them with the closure payout?`
      )
    ) {
      return;
    }

    setProcessing(week.start);
    try {
      const run =
        existingRun ||
        (await createPayrollRun({
          periodStart: week.start,
          periodEnd: week.end,
          payCycleType: payCycleSettings?.payCycleType || "Weekly",
          notes: `Company closure payout (${closure.name}). Paid in advance on ${closure.payoutDate}.`,
        }));
      if (!run) return;

      await runPayrollProcess(calendarDateFromIso(week.start), calendarDateFromIso(week.end), {
        replaceExisting,
        payDate: format(parseISO(closure.payoutDate), "dd/MM/yyyy"),
        paidInAdvanceClosureId: closure.id,
      });

      const saved = payslipsForPayrollPeriod(
        await fetchPayslipsFromSupabase(),
        calendarDateFromIso(week.start),
        calendarDateFromIso(week.end)
      ).filter((p) => p.paidInAdvanceClosureId === closure.id);
      if (saved.length === 0) return;

      const ok = await replaceRunItems(
        run.id,
        saved.map((p) => ({
          employeeId: p.employeeId,
          payslipId: p.id,
          payPeriod: p.payPeriod,
          grossEarnings: p.grossEarnings,
          totalDeductions: p.totalDeductions,
          netPay: p.netPay,
        }))
      );
      if (!ok) {
        showError("Payslips were saved, but the payroll run items could not be updated. Open the run and regenerate.");
      }
      await insertAuditLog("payroll_run", run.id, "Closure payout generated", {
        closureId: closure.id,
        payDate: closure.payoutDate,
        count: saved.length,
      });
      await Promise.all([refetchPayslips?.(), loadRuns()]);
      showSuccess(`${saved.length} payslip(s) for ${formatDay(week.start)} – ${formatDay(week.end)} paid in advance.`);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Closure payout</CardTitle>
        <CardDescription>
          Process each week in order on the payout day ({format(parseISO(closure.payoutDate), "EEE d MMM yyyy")}). Each week
          gets its own payslip, so PAYE and UIF stay weekly, and its own payroll run for approval and payment. The re-opening
          week is processed as normal after the factory re-opens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {advanceWeeks.map((week, index) => {
          const { existing, run, paidByClosure } = weekStatus(week);
          const previousDone = index === 0 || weekStatus(advanceWeeks[index - 1]).paidByClosure;
          return (
            <div
              key={week.start}
              className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {week.kind === "closing" ? "Closing week" : "Shutdown week"}: {formatDay(week.start)} – {formatDay(week.end)}
                  {paidByClosure ? (
                    <Badge className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Paid in advance
                    </Badge>
                  ) : existing.length > 0 ? (
                    <Badge variant="secondary">{existing.length} normal payslip(s)</Badge>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {run ? (
                    <>
                      Payroll run: {run.status} ·{" "}
                      <Link className="underline" to={`/payroll/runs/${run.id}`}>
                        open run
                      </Link>
                    </>
                  ) : (
                    "No payroll run yet"
                  )}
                </div>
              </div>
              {canProcess && (
                <Button
                  size="sm"
                  variant={paidByClosure ? "outline" : "default"}
                  disabled={!!processing || !previousDone || (!!run && run.status !== "Draft")}
                  onClick={() => processWeek(week)}
                  title={!previousDone ? "Process the previous week first" : undefined}
                >
                  {processing === week.start ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {paidByClosure ? "Regenerate" : "Process week"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ClosurePayoutPanel;
