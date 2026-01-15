"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
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
  const { runPayrollProcess, isMockDataEnabled } = usePayrollProcessor({ silent: true });
  const { employees } = useEmployeesData({ isMockDataEnabled: false, companyName: "Company", isAuthenticated: true, isLoadingAuth: false });

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollRunItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const r = await fetchPayrollRunById(id);
      setRun(r);
      const its = await fetchRunItems(id);
      setItems(its);
      setLoading(false);
    };
    load();
  }, [id]);

  const targetPeriodString = useMemo(() => {
    if (!run) return null;
    return `${run.periodStart} - ${run.periodEnd}`;
  }, [run]);

  const handleTransition = async (next: PayrollRunStatus) => {
    if (!run || !id) return;
    const toastId = showLoading("Updating run status...") as string;
    try {
      const ok = await updatePayrollRunStatus(id, next, user?.id ?? null);
      if (ok) {
        setRun({ ...run, status: next });
        showSuccess(`Run moved to ${next}.`);
        await logAuditEvent(`Run ${id} status updated to ${next}`);
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const handleProcessPeriod = async () => {
    if (!run || !id) return;
    if (isMockDataEnabled) {
      showError("Disable mock data to process and store run items.");
      return;
    }
    const psToast = showLoading("Processing payslips for this period...") as string;
    try {
      // Run payroll for the selected period, saving payslips to DB
      const start = new Date(run.periodStart);
      const end = new Date(run.periodEnd);
      await runPayrollProcess(start, end);

      // Fetch payslips and build run items for this period
      const payslips = await fetchPayslipsFromSupabase();
      const periodPayslips = payslips.filter(p => p.payPeriod === targetPeriodString);
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
        await logAuditEvent(`Run ${id}: ${newItems.length} items generated from payslips`);
      }
    } finally {
      dismissToast(psToast);
    }
  };

  if (loading || !run) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const nextStatuses = statusFlow[run.status];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Run</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          </div>

          <div className="flex flex-wrap gap-2">
            {nextStatuses.map(ns => (
              <Button key={ns} onClick={() => handleTransition(ns)}>
                Move to {ns}
              </Button>
            ))}
            <Button variant="outline" onClick={handleProcessPeriod}>
              Generate items from payslips
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!run || !id) return;
                if (isMockDataEnabled) {
                  showError("Disable mock data to create live payment batches.");
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

                  // Snapshot bank info from employees
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
                  }
                } finally {
                  dismissToast(toastId);
                }
              }}
            >
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
                    <TableCell className="font-medium">{it.employeeId}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollRunDetailPage;