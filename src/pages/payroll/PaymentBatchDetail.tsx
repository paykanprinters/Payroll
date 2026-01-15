"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { fetchPaymentBatchById, fetchBatchItems, updateBatchStatus, updateItemStatus, updateBatchFormat, PaymentBatch, PaymentBatchItem } from "@/integrations/supabase/payment-batch-queries";
import { isValidAccountNumber, isValidBranchCode } from "@/lib/payments/validators";
import { generateEftCsv, generateNachaAch, generateSepaXml } from "@/lib/payments/formats";

const PaymentBatchDetailPage: React.FC = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState<PaymentBatch | null>(null);
  const [items, setItems] = useState<PaymentBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<string>("EFT-CSV");

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const b = await fetchPaymentBatchById(id);
      const its = await fetchBatchItems(id);
      setBatch(b);
      setItems(its);
      setFormat(b?.bankFormat || "EFT-CSV");
      setLoading(false);
    };
    load();
  }, [id]);

  const controlTotals = useMemo(() => {
    const count = items.length;
    const total = items.reduce((s, it) => s + Number(it.netPay || 0), 0);
    return { count, total };
  }, [items]);

  const validations = useMemo(() => {
    return items.map(it => {
      const accOk = isValidAccountNumber(it.accountNumber);
      const brOk = isValidBranchCode(it.branchCode);
      return { id: it.id, employeeId: it.employeeId, accountOk: accOk, branchOk: brOk };
    });
  }, [items]);

  const invalidCount = useMemo(() => validations.filter(v => !v.accountOk || !v.branchOk).length, [validations]);

  const exportContent = useMemo(() => {
    const mapped = items.map(it => ({
      employeeId: it.employeeId,
      accountHolder: it.accountHolder || "",
      bankName: it.bankName || "",
      accountNumber: it.accountNumber || "",
      branchCode: it.branchCode || "",
      amount: Number(it.netPay || 0),
    }));
    if (format === "EFT-CSV") return { data: generateEftCsv(mapped), filename: `payment-batch-${batch?.id || "unknown"}.csv`, mime: "text/csv" };
    if (format === "NACHA-ACH") return { data: generateNachaAch(mapped), filename: `payment-batch-${batch?.id || "unknown"}.ach`, mime: "text/plain" };
    if (format === "SEPA-XML") return { data: generateSepaXml(mapped), filename: `payment-batch-${batch?.id || "unknown"}.xml`, mime: "application/xml" };
    return { data: generateEftCsv(mapped), filename: `payment-batch-${batch?.id || "unknown"}.csv`, mime: "text/csv" };
  }, [items, format, batch]);

  const handleDownload = async () => {
    if (!id) return;
    if (invalidCount > 0) {
      showError(`Validation failed for ${invalidCount} item(s). Fix data before export.`);
      return;
    }
    const blob = new Blob([exportContent.data], { type: `${exportContent.mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportContent.filename;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(`Bank file (${format}) downloaded.`);
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

  const updateFormat = async (newFormat: string) => {
    setFormat(newFormat);
    if (!id) return;
    const ok = await updateBatchFormat(id, newFormat);
    if (!ok) {
      showError("Failed to update batch format.");
    } else {
      setBatch(prev => prev ? { ...prev, bankFormat: newFormat } : prev);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            <div>
              <div className="text-sm text-muted-foreground">Bank Format</div>
              <Select value={format} onValueChange={updateFormat}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFT-CSV">EFT-CSV (South Africa)</SelectItem>
                  <SelectItem value="NACHA-ACH">NACHA/ACH (US)</SelectItem>
                  <SelectItem value="SEPA-XML">SEPA XML (EU pain.001)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-2 p-3 border rounded-md bg-blue-50 text-blue-900 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Validation & Control Totals</div>
              <Badge variant="outline" className={invalidCount === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {invalidCount === 0 ? "All good" : `${invalidCount} issue(s)`}
              </Badge>
            </div>
            <div className="text-sm">
              <div>Items: {controlTotals.count}</div>
              <div>Total Amount: R{Number(controlTotals.total).toFixed(2)}</div>
            </div>
            {invalidCount > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Account OK</TableHead>
                    <TableHead>Branch/Routing OK</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validations.filter(v => !v.accountOk || !v.branchOk).map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.employeeId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.accountOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {v.accountOk ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.branchOk ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {v.branchOk ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownload} disabled={invalidCount > 0}>Download ({format})</Button>
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
                  <TableHead>Branch/Routing</TableHead>
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