"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { fetchPaymentBatchById, fetchBatchItems, updateBatchStatus, updateItemStatus, PaymentBatch, PaymentBatchItem } from "@/integrations/supabase/payment-batch-queries";

const PaymentBatchDetailPage: React.FC = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState<PaymentBatch | null>(null);
  const [items, setItems] = useState<PaymentBatchItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    const headers = ["account_number","branch_code","amount","account_holder","employee_id"];
    const lines = [headers.join(",")];
    items.forEach(it => {
      const line = [
        (it.accountNumber || "").replace(/,/g, ""),
        (it.branchCode || "").replace(/,/g, ""),
        Number(it.netPay).toFixed(2),
        `"${(it.accountHolder || "").replace(/"/g, '""')}"`,
        it.employeeId
      ].join(",");
      lines.push(line);
    });
    return lines.join("\n");
  }, [items]);

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
        setBatch(prev => prev ? { ...prev, status: "Exported" } : prev);
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
        setBatch(prev => prev ? { ...prev, status: "Reconciled" } : prev);
        showSuccess("Batch reconciled.");
      }
    } finally {
      dismissToast(toastId);
    }
  };

  const handleItemException = async (itemId: string, status: "Failed" | "Returned", message: string) => {
    const ok = await updateItemStatus(itemId, status, message);
    if (ok) {
      const refreshed = await fetchBatchItems(id!);
      setItems(refreshed);
      showSuccess("Item updated.");
    }
  };

  if (loading || !batch) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading batch...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Batch ID</div>
              <div className="font-mono text-xs">{batch.id}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Run</div>
              <div className="font-mono text-xs">{batch.runId}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant="outline">{batch.status}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownload}>Download bank file (CSV)</Button>
            <Button variant="outline" onClick={markExported}>Mark Exported</Button>
            <Button variant="outline" onClick={markReconciled}>Mark Reconciled</Button>
          </div>

          <div className="mt-4">
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
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.employeeId}</TableCell>
                    <TableCell>{it.accountHolder || "-"}</TableCell>
                    <TableCell>{it.accountNumber || "-"}</TableCell>
                    <TableCell>{it.branchCode || "-"}</TableCell>
                    <TableCell>R{Number(it.netPay).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline">{it.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Reason"
                          className="w-40"
                          onBlur={(e) => {
                            const msg = e.currentTarget.value;
                            if (msg && msg.trim().length > 0) {
                              // Store on element for reuse in buttons
                              (e.currentTarget as any).__msg__ = msg.trim();
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const msg = ((e.currentTarget.previousSibling as any)?.__msg__ as string) || "Payment failed";
                            handleItemException(it.id, "Failed", msg);
                          }}
                        >
                          Mark Failed
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const msg = ((e.currentTarget.previousSibling?.previousSibling as any)?.__msg__ as string) || "Payment returned";
                            handleItemException(it.id, "Returned", msg);
                          }}
                        >
                          Mark Returned
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No items in this batch.</TableCell>
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