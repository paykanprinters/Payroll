"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess, showLoading, dismissToast } from "@/utils/toast";
import {
  fetchPaymentBatchById,
  fetchBatchItems,
  updateBatchStatus,
  updateItemStatus,
  PaymentBatch,
  PaymentBatchItem,
} from "@/integrations/supabase/payment-batch-queries";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { Download, CheckCircle2, FileCheck2, XCircle } from "lucide-react";

type ItemActionStatus = "Failed" | "Returned";

type ItemExceptionDraft = {
  reason: string;
};

const PaymentBatchDetailPage: React.FC = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState<PaymentBatch | null>(null);
  const [items, setItems] = useState<PaymentBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, ItemExceptionDraft>>({});

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const b = await fetchPaymentBatchById(id);
      const its = await fetchBatchItems(id);
      setBatch(b);
      setItems(its);
      setLoading(false);
    };
    load();
  }, [id]);

  const csvContent = useMemo(() => {
    // Simple EFT CSV: account_number,branch_code,amount,account_holder,employee_id
    const headers = ["account_number", "branch_code", "amount", "account_holder", "employee_id"];
    const lines = [headers.join(",")];
    items.forEach((it) => {
      const line = [
        (it.accountNumber || "").replace(/,/g, ""),
        (it.branchCode || "").replace(/,/g, ""),
        Number(it.netPay).toFixed(2),
        `"${(it.accountHolder || "").replace(/"/g, '""')}"`,
        it.employeeId,
      ].join(",");
      lines.push(line);
    });
    return lines.join("\n");
  }, [items]);

  const totals = useMemo(() => {
    const totalAmount = items.reduce((sum, it) => sum + Number(it.netPay || 0), 0);
    const missingBank = items.filter((it) => !it.accountNumber || !it.branchCode).length;
    const exceptions = items.filter((it) => it.status === "Failed" || it.status === "Returned").length;
    return { totalAmount, missingBank, exceptions };
  }, [items]);

  const statusBadgeClass = (status: string) => {
    if (status === "Reconciled") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Exported") return "bg-sky-50 text-sky-700 border-sky-200";
    if (status === "Pending") return "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "Failed") return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "Returned") return "bg-orange-50 text-orange-700 border-orange-200";
    return "";
  };

  const handleDownload = () => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `payment-batch-${batch?.id || "unknown"}.csv`;
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Bank file downloaded.");
  };

  const markExported = async () => {
    if (!id) return;
    const toastId = showLoading("Marking batch as exported...") as string;
    try {
      const ok = await updateBatchStatus(id, "Exported");
      if (ok) {
        setBatch((prev) => (prev ? { ...prev, status: "Exported" } : prev));
        showSuccess("Batch marked as exported.");
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const markReconciled = async () => {
    if (!id) return;
    const toastId = showLoading("Marking batch as reconciled...") as string;
    try {
      const ok = await updateBatchStatus(id, "Reconciled");
      if (ok) {
        setBatch((prev) => (prev ? { ...prev, status: "Reconciled" } : prev));
        showSuccess("Batch reconciled.");
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const handleItemException = async (itemId: string, status: ItemActionStatus) => {
    const reason = (drafts[itemId]?.reason || "").trim();
    const fallback = status === "Failed" ? "Payment failed" : "Payment returned";
    const ok = await updateItemStatus(itemId, status, reason || fallback);
    if (ok) {
      const refreshed = await fetchBatchItems(id!);
      setItems(refreshed);
      showSuccess("Item updated.");
    }
  };

  if (loading || !batch) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading batch...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl -tracking-tight">Payment Batch</CardTitle>
            <div className="text-sm text-muted-foreground">Generate and reconcile a bank payment file.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={markExported}>
              <FileCheck2 className="h-4 w-4" />
              Mark Exported
            </Button>
            <Button variant="outline" onClick={markReconciled}>
              <CheckCircle2 className="h-4 w-4" />
              Mark Reconciled
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Batch ID</div>
              <div className="mt-1 font-mono text-xs">{batch.id}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Related run</div>
              <div className="mt-1 font-mono text-xs">{batch.runId}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge variant="outline" className={statusBadgeClass(batch.status)}>
                  {batch.status}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Total amount</div>
              <div className="mt-1 text-lg font-semibold">R {totals.totalAmount.toFixed(2)}</div>
            </div>
          </div>

          {(totals.missingBank > 0 || totals.exceptions > 0) && (
            <div className="rounded-2xl border bg-amber-50 p-4 text-amber-900">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="font-medium">Attention needed</div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {totals.missingBank > 0 && (
                    <span className="rounded-full bg-white/60 px-3 py-1">{totals.missingBank} missing bank details</span>
                  )}
                  {totals.exceptions > 0 && (
                    <span className="rounded-full bg-white/60 px-3 py-1">{totals.exceptions} exception(s)</span>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-amber-800">
                Resolve missing bank details in employee profiles before exporting, and log any failed/returned payments for follow-up.
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Account Holder</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Exception</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => {
                  const draft = drafts[it.id]?.reason || "";
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="font-mono text-xs">{it.employeeId}</TableCell>
                      <TableCell>{it.accountHolder || "-"}</TableCell>
                      <TableCell className={!it.accountNumber ? "text-amber-700" : ""}>{it.accountNumber || "-"}</TableCell>
                      <TableCell className={!it.branchCode ? "text-amber-700" : ""}>{it.branchCode || "-"}</TableCell>
                      <TableCell>R{Number(it.netPay).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(it.status)}>
                          {it.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                          <div className="w-full md:w-56">
                            <Label className="sr-only" htmlFor={`reason-${it.id}`}>Reason</Label>
                            <Input
                              id={`reason-${it.id}`}
                              placeholder="Reason (optional)"
                              value={draft}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [it.id]: { reason: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemException(it.id, "Failed")}
                          >
                            <XCircle className="h-4 w-4" />
                            Failed
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemException(it.id, "Returned")}
                          >
                            Returned
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No items in this batch.
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

export default PaymentBatchDetailPage;