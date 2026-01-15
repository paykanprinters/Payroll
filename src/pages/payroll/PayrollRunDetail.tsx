"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { fetchPayslipsFromSupabase } from "@/integrations/supabase/payslip-queries";
import { logAuditEvent } from "@/utils/audit";
import {
  fetchPayrollRunById,
  fetchRunItems,
  addRunItems,
  updatePayrollRunStatus,
  PayrollRun,
  PayrollRunItem,
  PayrollRunStatus,
} from "@/integrations/supabase/payroll-run-queries";
import { createPaymentBatch, addBatchItems } from "@/integrations/supabase/payment-batch-queries";
import { useEmployeesData } from "@/hooks/use-employees-data";
import { insertAuditLog, fetchAuditLogsForEntity } from "@/integrations/supabase/audit-queries";
import { createRunSnapshot } from "@/integrations/supabase/run-snapshot-queries";
import { useOvertimeRules } from "@/hooks/use-overtime-rules";
import { useReadinessGates, ReadinessBlocker } from "@/hooks/use-readiness-gates";
import { supabase } from "@/integrations/supabase/client";

const statusFlow: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  Draft: ["Reviewed"],
  Reviewed: ["Approved"],
  Approved: ["Locked"],
  Locked: ["Paid"],
  Paid: [],
};

const PayrollRunDetailPage: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    runPayrollProcess,
    isMockDataEnabled,
    employees,
    timesheets,
    companyDetails,
    userTaxSettings,
    taxTables,
    updateTimesheetStatus,
  } = usePayrollProcessor({ silent: true });
  const { rules: overtimeRules } = useOvertimeRules();
  const { computeBlockers, isPastCutOff, buildReminderPayload } = useReadinessGates();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<ReadinessBlocker[]>([]);

  const targetPeriod = useMemo(() => {
    if (!run) return null;
    return { start: new Date(run.periodStart), end: new Date(run.periodEnd) };
  }, [run]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const r = await fetchPayrollRunById(id);
      setRun(r);
      const its = await fetchRunItems(id);
      setItems(its);
      const logs = await fetchAuditLogsForEntity('payroll_run', id);
      setAudits(logs);
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (run && targetPeriod) {
      const b = computeBlockers(
        employees || [],
        timesheets || [],
        companyDetails || null,
        userTaxSettings || null,
        targetPeriod.start,
        targetPeriod.end
      );
      setBlockers(b);
    }
  }, [run, employees, timesheets, companyDetails, userTaxSettings, computeBlockers, targetPeriod]);

  const handleTransition = async (next: PayrollRunStatus) => {
    if (!run || !id) return;

    // Maker-checker: prevent approval by same user who reviewed
    if (next === 'Approved' && (run as any).reviewedBy && user?.id && (run as any).reviewedBy === user.id) {
      showError("Maker-checker: Approval must be done by a different user than the reviewer.");
      return;
    }

    // Readiness gate: prevent approval when blockers exist
    if (next === 'Approved' && blockers.length > 0) {
      showError("Readiness gates: Resolve blockers before approval.");
      return;
    }

    const toastId = showLoading("Updating run status...") as string;
    try {
      const ok = await updatePayrollRunStatus(id, next, user?.id ?? null);
      if (ok) {
        const updated: any = { ...run, status: next };
        if (next === 'Reviewed') {
          updated.reviewedBy = user?.id ?? null;
          updated.reviewedAt = new Date().toISOString();
        } else if (next === 'Approved') {
          updated.approvedBy = user?.id ?? null;
          updated.approvedAt = new Date().toISOString();
        } else if (next === 'Locked') {
          updated.lockedAt = new Date().toISOString();
        } else if (next === 'Paid') {
          updated.paidAt = new Date().toISOString();
        }
        setRun(updated);
        showSuccess(`Run moved to ${next}.`);

        // Snapshot at Approved or Locked
        if ((next === 'Approved' || next === 'Locked') && taxTables) {
          const snapshotData = { taxTables, overtimeRules: overtimeRules || null };
          const snapOk = await createRunSnapshot(id, next, snapshotData);
          if (snapOk) await insertAuditLog('payroll_run', id, `Snapshot created (${next})`, { snapshotType: next });
        }

        await insertAuditLog('payroll_run', id, `Status updated to ${next}`, { by: user?.id || null });
        setAudits(await fetchAuditLogsForEntity('payroll_run', id));
        await logAuditEvent(`Run ${id} status updated to ${next}`, 'payroll_run', id, { by: user?.id || null });
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const handleProcessPeriod = async () => {
    if (!run || !id || !targetPeriod) return;
    if (isMockDataEnabled) {
      showError("Disable mock data to process and store run items.");
      return;
    }
    const psToast = showLoading("Processing payslips for this period...") as string;
    try {
      const start = targetPeriod.start;
      const end = targetPeriod.end;
      await runPayrollProcess(start, end);

      const payslips = await fetchPayslipsFromSupabase();
      const periodStr = `${run.periodStart} - ${run.periodEnd}`;
      const periodPayslips = payslips.filter(p => p.payPeriod === periodStr);
      if (periodPayslips.length === 0) {
        showError("No payslips found for the period after processing.");
        return;
      }

      const newItems = periodPayslips.map(p => ({
        employeeId: p.employeeId,
        payslipId: p.id,
        payPeriod: p.payPeriod,
        grossEarnings: p.grossEarnings,
        totalDeductions: p.totalDeductions,
        netPay: p.netPay,
      }));

      const ok = await addRunItems(id, newItems);
      if (ok) {
        const refreshed = await fetchRunItems(id);
        setItems(refreshed);
        showSuccess(`Added ${newItems.length} items to the run.`);
        await insertAuditLog('payroll_run', id, `Run items generated`, { count: newItems.length });
      }
    } finally {
      dismissToast(psToast);
    }
  };

  const handleCreatePaymentBatch = async () => {
    if (!run || !id || isMockDataEnabled) {
      if (isMockDataEnabled) showError("Disable mock data to create live payment batches.");
      return;
    }
    const toastId = showLoading("Creating payment batch...") as string;
    try {
      const runItems = await fetchRunItems(id);
      if (runItems.length === 0) {
        showError("No run items found. Generate items from payslips first.");
        return;
      }
      const totalAmount = runItems.reduce((sum, it) => sum + Number(it.netPay || 0), 0);
      const batch = await createPaymentBatch(id, "EFT-CSV", runItems.length, totalAmount);
      if (!batch) return;

      const itemsToInsert = runItems.map(ri => {
        const emp = employees.find(e => e.id === ri.employeeId);
        return {
          employeeId: ri.employeeId,
          netPay: Number(ri.netPay),
          accountHolder: emp?.bankAccountHolder || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim(),
          bankName: emp?.bankName || null,
          accountNumber: emp?.accountNumber || null,
          branchCode: emp?.branchCode || null,
          status: "Pending" as const,
          errorMessage: null,
        };
      });
      const ok = await addBatchItems(batch.id, itemsToInsert);
      if (ok) {
        showSuccess(`Payment batch ${batch.id} created with ${itemsToInsert.length} items.`);
        await insertAuditLog('payroll_run', id, `Payment batch created`, { batchId: batch.id, items: itemsToInsert.length });
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const autoLockPendingTimesheets = async () => {
    if (!run || !targetPeriod) return;
    const list = timesheets.filter(ts =>
      ts.status !== "Locked" &&
      ts.employeeId &&
      new Date(ts.date) >= targetPeriod.start &&
      new Date(ts.date) <= targetPeriod.end
    );
    const toastId = showLoading(`Locking ${list.length} timesheets...`) as string;
    try {
      for (const ts of list) {
        await updateTimesheetStatus(ts.id, "Locked");
      }
      showSuccess(`${list.length} timesheets locked.`);
      await insertAuditLog('payroll_run', id!, `Auto-lock timesheets`, { count: list.length });
    } finally {
      dismissToast(toastId);
    }
  };

  const sendReminders = async () => {
    if (!id || blockers.length === 0) {
      showError("No blockers to send reminders for.");
      return;
    }
    const payload = {
      runId: id,
      reminders: buildReminderPayload(blockers),
    };
    const toastId = showLoading("Sending reminders...") as string;
    try {
      const { error } = await supabase.functions.invoke('send-payroll-reminders', { body: payload });
      if (error) {
        showError(`Failed to send reminders: ${error.message}`);
      } else {
        showSuccess("Reminders queued.");
        await insertAuditLog('payroll_run', id, `Reminders queued`, { count: payload.reminders.length });
      }
    } finally {
      dismissToast(toastId);
    }
  };

  if (loading || !run) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-muted-foreground">Loading run...</div>
      </div>
    );
  }

  const nextStatuses = statusFlow[run.status];
  const cutOffReached = targetPeriod ? isPastCutOff(targetPeriod.end) : false;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Period</div>
              <div className="font-medium">{run.periodStart} → {run.periodEnd}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cycle</div>
              <div className="font-medium">{run.payCycleType}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="outline">{run.status}</Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Review / Approval</div>
              <div className="text-xs">
                Reviewer: {(run as any).reviewedBy || '-'}<br />
                Approver: {(run as any).approvedBy || '-'}
              </div>
            </div>
          </div>

          {/* Readiness gates */}
          <div className="mt-2 p-3 border rounded-md bg-yellow-50 text-yellow-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Readiness Gates</div>
              <Badge variant="outline" className={blockers.length === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {blockers.length === 0 ? "No blockers" : `${blockers.length} blocker(s)`}
              </Badge>
            </div>
            {blockers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockers.map((b, idx) => {
                    const emp = employees.find(e => e.id === b.employeeId);
                    return (
                      <TableRow key={`${b.type}-${b.employeeId}-${idx}`}>
                        <TableCell>{b.type}</TableCell>
                        <TableCell className="font-mono text-xs">{emp ? `${emp.firstName} ${emp.lastName}` : (b.employeeId || "-")}</TableCell>
                        <TableCell>{b.message}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={b.severity === 'error' ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
                            {b.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="outline" onClick={sendReminders} disabled={blockers.length === 0}>
                Send reminders
              </Button>
              {cutOffReached && (
                <Button variant="outline" onClick={autoLockPendingTimesheets}>
                  Auto-lock pending timesheets
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Explicit Review action in Draft */}
            {run.status === 'Draft' && (
              <Button onClick={() => handleTransition('Reviewed')}>
                Review (first checker)
              </Button>
            )}
            {nextStatuses.map(ns => (
              <Button
                key={ns}
                onClick={() => handleTransition(ns)}
                disabled={(ns === 'Approved' && blockers.length > 0) || (ns === 'Approved' && (run as any).reviewedBy && user?.id === (run as any).reviewedBy)}
                title={(ns === 'Approved' && blockers.length > 0) ? "Resolve blockers before approval." :
                  ((ns === 'Approved' && (run as any).reviewedBy && user?.id === (run as any).reviewedBy) ? "Approval must be by a different user" : "")}
              >
                Move to {ns}
              </Button>
            ))}
            <Button variant="outline" onClick={handleProcessPeriod}>
              Generate items from payslips
            </Button>
            <Button variant="outline" onClick={handleCreatePaymentBatch}>
              Create payment batch
            </Button>
          </div>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.employeeId}</TableCell>
                    <TableCell>R{Number(it.grossEarnings).toFixed(2)}</TableCell>
                    <TableCell>R{Number(it.totalDeductions).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">R{Number(it.netPay).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No items yet. Process payslips to add items.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Audit trail */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Audit Trail</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{a.userId || '-'}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.metadata ? JSON.stringify(a.metadata) : '-'}</TableCell>
                  </TableRow>
                ))}
                {audits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No audit entries yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollRunDetailPage;