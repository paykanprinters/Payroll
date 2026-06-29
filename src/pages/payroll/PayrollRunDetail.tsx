"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { fetchPayslipsFromSupabase, deletePayslipsByIds } from "@/integrations/supabase/payslip-queries";
import { logAuditEvent } from "@/utils/audit";
import {
  fetchPayrollRunById,
  fetchRunItems,
  addRunItems,
  updatePayrollRunStatus,
  voidPayrollRun,
  PayrollRun,
  PayrollRunItem,
  PayrollRunStatus,
} from "@/integrations/supabase/payroll-run-queries";
import {
  createPaymentBatch,
  addBatchItems,
  fetchPaymentBatchByRunId,
  deletePaymentBatch,
  PaymentBatch,
} from "@/integrations/supabase/payment-batch-queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { insertAuditLog, fetchAuditLogsForEntity } from "@/integrations/supabase/audit-queries";
import { createRunSnapshot } from "@/integrations/supabase/run-snapshot-queries";
import { useOvertimeRules } from "@/hooks/use-overtime-rules";
import { useReadinessGates, ReadinessBlocker } from "@/hooks/use-readiness-gates";
import { supabase } from "@/integrations/supabase/client";
import PayrollRunHeader from "@/components/payroll/PayrollRunHeader";
import PayrollRunStepper, { PayrollRunStepId } from "@/components/payroll/PayrollRunStepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AlertTriangle, Ban, CheckCircle2, FileText, Landmark, Lock, Mail, Play, ShieldCheck } from "lucide-react";

const statusFlow: Record<PayrollRunStatus, PayrollRunStatus[]> = {
  Draft: ["Reviewed"],
  Reviewed: ["Approved"],
  Approved: ["Locked"],
  Locked: ["Paid"],
  Paid: [],
  Cancelled: [],
};

const statusToStep: Record<PayrollRunStatus, PayrollRunStepId> = {
  Draft: "items",
  Reviewed: "review",
  Approved: "approval",
  Locked: "payments",
  Paid: "paid",
  Cancelled: "items",
};

// A run can be voided up to (but not including) Paid. Once money has been
// disbursed it must be corrected via a reversal/adjustment run, not a void.
const VOIDABLE_STATUSES: PayrollRunStatus[] = ["Draft", "Reviewed", "Approved", "Locked"];

const blockerBadgeClass = (severity: "error" | "warning") => {
  return severity === "error"
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-amber-50 text-amber-800 border-amber-200";
};

const PayrollRunDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    runPayrollProcess,
    isMockDataEnabled,
    employees,
    timesheets,
    companyDetails,
    userTaxSettings,
    taxTables,
    activeTaxYearForCalculations,
    updateTimesheetStatus,
  } = usePayrollProcessor({ silent: true });
  const { rules: overtimeRules } = useOvertimeRules();
  const { computeBlockers, isPastCutOff, buildReminderPayload } = useReadinessGates();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<ReadinessBlocker[]>([]);
  const [activeTab, setActiveTab] = useState<"workflow" | "items" | "audit">("workflow");
  const [paymentBatch, setPaymentBatch] = useState<PaymentBatch | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

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
      const logs = await fetchAuditLogsForEntity("payroll_run", id);
      setAudits(logs);
      setPaymentBatch(await fetchPaymentBatchByRunId(id));
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
        targetPeriod.end,
        taxTables,
        activeTaxYearForCalculations
      );
      setBlockers(b);
    }
  }, [run, employees, timesheets, companyDetails, userTaxSettings, taxTables, activeTaxYearForCalculations, computeBlockers, targetPeriod]);

  const currentStep: PayrollRunStepId = useMemo(() => {
    if (!run) return "readiness";
    // If there are blockers, show readiness as the primary step even if in Draft
    if (blockers.length > 0) return "readiness";
    return statusToStep[run.status] ?? "items";
  }, [run, blockers.length]);

  const handleTransition = async (next: PayrollRunStatus) => {
    if (!run || !id) return;

    // Maker-checker: prevent approval by same user who reviewed
    if (
      next === "Approved" &&
      (run as any).reviewedBy &&
      user?.id &&
      (run as any).reviewedBy === user.id
    ) {
      showError("Maker-checker: Approval must be done by a different user than the reviewer.");
      return;
    }

    // Readiness gate: prevent approval when blockers exist
    if (next === "Approved" && blockers.length > 0) {
      showError("Readiness gates: Resolve blockers before approval.");
      return;
    }

    const toastId = showLoading("Updating run status...") as string;
    try {
      const ok = await updatePayrollRunStatus(id, next, user?.id ?? null);
      if (ok) {
        const updated: any = { ...run, status: next };
        if (next === "Reviewed") {
          updated.reviewedBy = user?.id ?? null;
          updated.reviewedAt = new Date().toISOString();
        } else if (next === "Approved") {
          updated.approvedBy = user?.id ?? null;
          updated.approvedAt = new Date().toISOString();
        } else if (next === "Locked") {
          updated.lockedAt = new Date().toISOString();
        } else if (next === "Paid") {
          updated.paidAt = new Date().toISOString();
        }
        setRun(updated);
        showSuccess(`Run moved to ${next}.`);

        // Snapshot at Approved or Locked
        if ((next === "Approved" || next === "Locked") && taxTables) {
          const snapshotData = { taxTables, overtimeRules: overtimeRules || null };
          const snapOk = await createRunSnapshot(id, next, snapshotData);
          if (snapOk)
            await insertAuditLog("payroll_run", id, `Snapshot created (${next})`, {
              snapshotType: next,
            });
        }

        await insertAuditLog("payroll_run", id, `Status updated to ${next}`, { by: user?.id || null });
        setAudits(await fetchAuditLogsForEntity("payroll_run", id));
        await logAuditEvent(`Run ${id} status updated to ${next}`, "payroll_run", id, {
          by: user?.id || null,
        });
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
      const periodPayslips = payslips.filter((p) => p.payPeriod === periodStr);
      if (periodPayslips.length === 0) {
        showError("No payslips found for the period after processing.");
        return;
      }

      const newItems = periodPayslips.map((p) => ({
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
        await insertAuditLog("payroll_run", id, `Run items generated`, { count: newItems.length });
        setActiveTab("items");
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

    const existing = await fetchPaymentBatchByRunId(id);
    if (existing) {
      setPaymentBatch(existing);
      navigate(`/payroll/batches/${existing.id}`);
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

      const itemsToInsert = runItems.map((ri) => {
        const emp = employees.find((e) => e.id === ri.employeeId);
        return {
          employeeId: ri.employeeId,
          netPay: Number(ri.netPay),
          accountHolder:
            emp?.bankAccountHolder || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim(),
          bankName: emp?.bankName || null,
          accountNumber: emp?.accountNumber || null,
          branchCode: emp?.branchCode || null,
          status: "Pending" as const,
          errorMessage: null,
        };
      });
      const ok = await addBatchItems(batch.id, itemsToInsert);
      if (ok) {
        setPaymentBatch(batch);
        showSuccess(`Payment batch ${batch.id} created.`);
        await insertAuditLog("payroll_run", id, `Payment batch created`, {
          batchId: batch.id,
          items: itemsToInsert.length,
        });
        navigate(`/payroll/batches/${batch.id}`);
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const handleVoidRun = async () => {
    if (!run || !id) return;
    const reason = voidReason.trim();
    if (reason.length < 5) {
      showError("Please provide a reason (at least 5 characters) for voiding this run.");
      return;
    }
    if (isMockDataEnabled) {
      showError("Disable mock data to void live payroll runs.");
      return;
    }
    if (!VOIDABLE_STATUSES.includes(run.status)) {
      showError("Only Draft, Reviewed, Approved or Locked runs can be voided.");
      return;
    }

    setIsVoiding(true);
    const toastId = showLoading("Voiding run...") as string;
    try {
      // 1) Reverse a pending payment batch (block if money is already in motion).
      const batch = await fetchPaymentBatchByRunId(id);
      if (batch) {
        if (batch.status === "Exported" || batch.status === "Reconciled") {
          showError(
            `This run has an ${batch.status.toLowerCase()} payment batch. Resolve the batch before voiding.`
          );
          return;
        }
        const batchOk = await deletePaymentBatch(batch.id);
        if (!batchOk) return;
        setPaymentBatch(null);
      }

      // 2) Reverse generated payslips so the run no longer affects YTD/reports.
      const runItems = await fetchRunItems(id);
      const payslipIds = runItems.map((it) => it.payslipId).filter((x): x is string => !!x);
      const payslipsOk = await deletePayslipsByIds(payslipIds);
      if (!payslipsOk) return;

      // 3) Mark the run Cancelled (record retained for audit).
      const ok = await voidPayrollRun(id, reason, user?.id ?? null);
      if (!ok) return;

      const updated: PayrollRun = {
        ...run,
        status: "Cancelled",
        cancelledBy: user?.id ?? null,
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
      };
      setRun(updated);
      setItems(await fetchRunItems(id));
      setVoidDialogOpen(false);
      setVoidReason("");
      showSuccess("Run voided.");

      await insertAuditLog("payroll_run", id, "Run voided", {
        by: user?.id || null,
        reason,
        payslipsRemoved: payslipIds.length,
        batchRemoved: !!batch,
      });
      setAudits(await fetchAuditLogsForEntity("payroll_run", id));
      await logAuditEvent(`Run ${id} voided`, "payroll_run", id, { by: user?.id || null, reason });
    } finally {
      dismissToast(toastId);
      setIsVoiding(false);
    }
  };

  const autoLockPendingTimesheets = async () => {
    if (!run || !targetPeriod) return;
    const list = timesheets.filter(
      (ts) =>
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
      await insertAuditLog("payroll_run", id!, `Auto-lock timesheets`, { count: list.length });
    } finally {
      dismissToast(toastId);
    }
  };

  const sendReminders = async () => {
    if (!id || blockers.length === 0) {
      showError("No blockers to send reminders for.");
      return;
    }
    const grouped = buildReminderPayload(blockers);
    const reminders = grouped.map((g) => {
      const emp = employees.find((e) => e.id === g.employeeId);
      const name = emp ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() : undefined;
      return {
        email: emp?.email,
        name,
        message: `${name ? name + ": " : ""}${g.messages.join("; ")}`,
      };
    });
    const runLabel = run ? `${run.periodStart} – ${run.periodEnd}` : undefined;
    const payload = { runId: id, runLabel, reminders };
    const toastId = showLoading("Sending reminders...") as string;
    try {
      const { data, error } = await supabase.functions.invoke("send-payroll-reminders", { body: payload });
      if (error) {
        showError(`Failed to send reminders: ${error.message}`);
      } else {
        const r = (data ?? {}) as { ok?: boolean; sent?: number; failed?: number; error?: string };
        if (r.ok === false && r.error) {
          showError(r.error);
        } else {
          showSuccess(`Reminders sent: ${r.sent ?? 0}${r.failed ? `, ${r.failed} failed` : ""}.`);
          await insertAuditLog("payroll_run", id, `Reminders sent`, { sent: r.sent ?? 0, failed: r.failed ?? 0 });
        }
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const actionLinkForBlocker = (b: ReadinessBlocker) => {
    if (b.type === "BANK_INFO" && b.employeeId) {
      return `/employees?employeeId=${encodeURIComponent(b.employeeId)}&focus=bank`;
    }
    if (b.type === "EMPLOYEE_TAX_INFO" && b.employeeId) {
      return `/employees?employeeId=${encodeURIComponent(b.employeeId)}&focus=tax`;
    }
    if (b.type === "COMPANY_TAX_INFO") {
      return `/settings/company-details?focus=tax`;
    }

    if ((b.type === "TIMESHEET_DRAFT" || b.type === "MISSING_TIMESHEET") && b.employeeId && run) {
      const start = run.periodStart;
      const end = run.periodEnd;
      const status = b.type === "TIMESHEET_DRAFT" ? "Draft" : "all";
      return `/timesheet?employeeId=${encodeURIComponent(b.employeeId)}&dateStart=${encodeURIComponent(
        start
      )}&dateEnd=${encodeURIComponent(end)}&status=${encodeURIComponent(status)}`;
    }

    return null;
  };

  if (loading || !run) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading run...</div>
      </div>
    );
  }

  const nextStatuses = statusFlow[run.status];
  const cutOffReached = targetPeriod ? isPastCutOff(targetPeriod.end) : false;
  const isCancelled = run.status === "Cancelled";
  const canGenerateItems =
    blockers.filter((b) => b.severity === "error").length === 0 && !isCancelled;
  const canVoid = VOIDABLE_STATUSES.includes(run.status) && !isMockDataEnabled;

  const paymentBadgeClass = (status: string) => {
    if (status === "Reconciled") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Exported") return "bg-sky-50 text-sky-700 border-sky-200";
    if (status === "Pending") return "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "Failed") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-background";
  };

  return (
    <div className="space-y-4">
      <PayrollRunHeader title={`Payroll Run`} subtitle={`Period ${run.periodStart} → ${run.periodEnd}`} />

      <PayrollRunStepper
        current={currentStep}
        status={run.status}
        blockersCount={blockers.length}
        itemsCount={items.length}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="workflow" className="rounded-lg">Workflow</TabsTrigger>
          <TabsTrigger value="items" className="rounded-lg">Run Items</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="mt-4 space-y-4">
          {isCancelled && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <div className="flex items-center gap-2 font-semibold">
                <Ban className="h-4 w-4" />
                This run has been voided
              </div>
              <div className="mt-1 text-sm text-rose-800">
                Generated payslips and any pending payment batch were reversed. The run is kept as a
                read-only record for audit. No further actions can be taken.
              </div>
              {run.cancellationReason && (
                <div className="mt-2 text-sm">
                  <span className="font-medium">Reason:</span> {run.cancellationReason}
                </div>
              )}
              <div className="mt-1 text-xs text-rose-700">
                Voided by <span className="font-mono">{run.cancelledBy || "-"}</span>
                {run.cancelledAt ? ` on ${new Date(run.cancelledAt).toLocaleString()}` : ""}
              </div>
            </div>
          )}
          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Run details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="mt-1 font-medium">{run.periodStart} → {run.periodEnd}</div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-xs text-muted-foreground">Cycle</div>
                  <div className="mt-1 font-medium">{run.payCycleType}</div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-white">{run.status}</Badge>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="text-xs text-muted-foreground">Review / Approval</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Reviewer: <span className="font-mono">{(run as any).reviewedBy || "-"}</span>
                    <br />
                    Approver: <span className="font-mono">{(run as any).approvedBy || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs text-muted-foreground">Run items</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <span className="font-semibold">{items.length}</span> item(s)
                    </div>
                    <Button
                      onClick={handleProcessPeriod}
                      disabled={!canGenerateItems}
                      title={!canGenerateItems ? "Resolve error blockers before generating items." : ""}
                      size="sm"
                    >
                      <Play className="h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs text-muted-foreground">Payslips</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Open payslips filtered to this run period.</div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/payslips/overview?dateStart=${run.periodStart}&dateEnd=${run.periodEnd}`)}
                      className="bg-white"
                      size="sm"
                    >
                      <FileText className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs text-muted-foreground">Payment batch</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <div className="text-sm">
                        {paymentBatch ? (
                          <Badge variant="outline" className={cn("w-fit", paymentBadgeClass(paymentBatch.status))}>
                            {paymentBatch.status}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not created</span>
                        )}
                      </div>
                      {paymentBatch && <div className="text-xs font-mono text-muted-foreground">{paymentBatch.id}</div>}
                    </div>

                    {paymentBatch ? (
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/payroll/batches/${paymentBatch.id}`)}
                        className="bg-white"
                        size="sm"
                      >
                        <Landmark className="h-4 w-4" />
                        Open
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleCreatePaymentBatch}
                        disabled={items.length === 0 || isCancelled}
                        title={items.length === 0 ? "Generate items first." : ""}
                        size="sm"
                      >
                        <Landmark className="h-4 w-4" />
                        Create
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-amber-50 p-4 text-amber-900">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Readiness gates
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "bg-white",
                      blockers.length === 0
                        ? "border-emerald-200 text-emerald-800"
                        : "border-amber-200 text-amber-900"
                    )}
                  >
                    {blockers.length === 0 ? "No blockers" : `${blockers.length} blocker(s)`}
                  </Badge>
                </div>

                {blockers.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {blockers.map((b, idx) => {
                            const emp = b.employeeId ? employees.find((e) => e.id === b.employeeId) : null;
                            const link = actionLinkForBlocker(b);
                            return (
                              <TableRow key={`${b.type}-${b.employeeId || "company"}-${idx}`}>
                                <TableCell className="font-mono text-xs">{b.type}</TableCell>
                                <TableCell className="text-sm">
                                  {emp ? `${emp.firstName} ${emp.lastName}` : b.employeeId ? b.employeeId : "Company"}
                                </TableCell>
                                <TableCell className="text-sm">{b.message}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={blockerBadgeClass(b.severity)}>
                                    {b.severity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {link ? (
                                    <Button variant="outline" size="sm" onClick={() => navigate(link)}>
                                      Open
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={sendReminders}>
                        <Mail className="h-4 w-4" />
                        Send reminders
                      </Button>
                      {cutOffReached && (
                        <Button variant="outline" onClick={autoLockPendingTimesheets}>
                          <Lock className="h-4 w-4" />
                          Auto-lock timesheets
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    This run is ready for review and approval.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Approvals</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {isCancelled
                        ? "This run is voided and read-only."
                        : "Use the buttons below to move the run through maker-checker approvals."}
                    </div>
                  </div>
                  {canVoid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => setVoidDialogOpen(true)}
                    >
                      <Ban className="h-4 w-4" />
                      Void run
                    </Button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {run.status === "Draft" && (
                    <Button onClick={() => handleTransition("Reviewed")}>
                      <ShieldCheck className="h-4 w-4" />
                      Review
                    </Button>
                  )}

                  {nextStatuses.map((ns) => (
                    <Button
                      key={ns}
                      onClick={() => handleTransition(ns)}
                      disabled={
                        (ns === "Approved" && blockers.length > 0) ||
                        (ns === "Approved" &&
                          (run as any).reviewedBy &&
                          user?.id === (run as any).reviewedBy)
                      }
                      title={
                        ns === "Approved" && blockers.length > 0
                          ? "Resolve blockers before approval."
                          : ns === "Approved" &&
                            (run as any).reviewedBy &&
                            user?.id === (run as any).reviewedBy
                          ? "Approval must be by a different user"
                          : ""
                      }
                      variant={ns === "Paid" ? "default" : "outline"}
                    >
                      {ns === "Locked" ? (
                        <>
                          <Lock className="h-4 w-4" /> Lock
                        </>
                      ) : ns === "Paid" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" /> Mark Paid
                        </>
                      ) : (
                        <>Move to {ns}</>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {isMockDataEnabled && (
                <div className="rounded-2xl border bg-amber-50 p-4 text-amber-900">
                  <div className="font-medium">Mock data enabled</div>
                  <div className="mt-1 text-sm text-amber-800">
                    Disable mock data to persist payroll runs, items, and payment batches.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-4 space-y-4">
          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Run items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((it) => {
                      const emp = employees.find((e) => e.id === it.employeeId);
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : it.employeeId}</div>
                            <div className="text-xs text-muted-foreground font-mono">{it.employeeId}</div>
                          </TableCell>
                          <TableCell className="text-right">R{Number(it.grossEarnings).toFixed(2)}</TableCell>
                          <TableCell className="text-right">R{Number(it.totalDeductions).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">R{Number(it.netPay).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No items yet. Generate items to populate this run.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card className="rounded-2xl border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border bg-white">
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
                    {audits.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">
                          {a.createdAt ? new Date(a.createdAt).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{a.userId || "-"}</TableCell>
                        <TableCell>{a.action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.metadata ? JSON.stringify(a.metadata) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {audits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No audit entries yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={voidDialogOpen} onOpenChange={(o) => !isVoiding && setVoidDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Ban className="h-5 w-5" />
              Void this payroll run
            </DialogTitle>
            <DialogDescription>
              Voiding marks the run as <span className="font-medium">Cancelled</span> and keeps it as a
              read-only audit record. This will permanently reverse the run's generated payslips
              {paymentBatch ? " and its pending payment batch" : ""}, removing their impact on
              year-to-date totals and statutory reports. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason for voiding</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Run created for the wrong period / loaded by mistake."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
              disabled={isVoiding}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleVoidRun}
              disabled={isVoiding || voidReason.trim().length < 5}
            >
              <Ban className="h-4 w-4" />
              {isVoiding ? "Voiding..." : "Void run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollRunDetailPage;