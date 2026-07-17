"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import {
  fetchPaymentBatchById,
  fetchBatchItems,
  updateBatchStatus,
  updateItemStatus,
  PaymentBatch,
  PaymentBatchItem,
} from "@/integrations/supabase/payment-batch-queries";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { getEmployeeName } from "@/lib/utils";
import { generateBankservAcbFile } from "@/lib/bank-disbursement/bankserv-acb";
import { generateGenericPaymentCsv } from "@/lib/bank-disbursement/generic-csv";
import { validatePaymentBatchForExport } from "@/lib/bank-disbursement/validate-payment-batch";
import type { PaymentExportItem } from "@/lib/bank-disbursement/types";
import { downloadBlob } from "@/lib/native-blob-download";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { Download, CheckCircle2, FileCheck2, XCircle, AlertTriangle } from "lucide-react";

type ItemActionStatus = "Failed" | "Returned";

type ItemExceptionDraft = {
  reason: string;
};

const PaymentBatchDetailPage: React.FC = () => {
  const { id } = useParams();
  const { companyDetails, employees } = usePayrollProcessor();
  const [batch, setBatch] = useState<PaymentBatch | null>(null);
  const [items, setItems] = useState<PaymentBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, ItemExceptionDraft>>({});
  const [actionDate, setActionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toReference, setToReference] = useState("SALARY");
  const [fromReference, setFromReference] = useState("PAYROLL");

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

  const exportItems: PaymentExportItem[] = useMemo(
    () =>
      items.map((it) => {
        const emp = employees.find((e) => e.id === it.employeeId);
        return {
          id: it.id,
          employeeId: it.employeeId,
          employeeName: emp ? getEmployeeName(it.employeeId, employees) : it.employeeId,
          netPay: Number(it.netPay),
          accountHolder: it.accountHolder,
          bankName: it.bankName ?? emp?.bankName,
          accountNumber: it.accountNumber ?? emp?.accountNumber,
          branchCode: it.branchCode ?? emp?.branchCode,
          bankAccountType: emp?.bankAccountType,
          status: it.status,
        };
      }),
    [items, employees]
  );

  const companyAccount = useMemo(
    () =>
      companyDetails
        ? {
            branchCode: companyDetails.branchCode ?? "",
            accountNumber: companyDetails.accountNumber ?? "",
            accountHolder: companyDetails.accountholdername,
            accountType: companyDetails.accountType,
            bankName: companyDetails.bankName,
          }
        : null,
    [companyDetails]
  );

  const validation = useMemo(
    () => validatePaymentBatchForExport(exportItems, companyAccount),
    [exportItems, companyAccount]
  );

  const totals = useMemo(() => {
    const totalAmount = items.reduce((sum, it) => sum + Number(it.netPay || 0), 0);
    const missingBank = exportItems.filter((it) => !it.accountNumber || !it.branchCode).length;
    const exceptions = items.filter((it) => it.status === "Failed" || it.status === "Returned").length;
    return { totalAmount, missingBank, exceptions };
  }, [items, exportItems]);

  const statusBadgeClass = (status: string) => {
    if (status === "Reconciled") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Exported") return "bg-sky-50 text-sky-700 border-sky-200";
    if (status === "Pending") return "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "Failed") return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "Returned") return "bg-orange-50 text-orange-700 border-orange-200";
    return "";
  };

  const downloadFile = async (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    await downloadBlob(blob, filename, mime);
  };

  const handleDownloadAcb = async () => {
    if (!validation.valid || !companyAccount?.branchCode || !companyAccount?.accountNumber) {
      showError("Fix validation errors before downloading the bank file.");
      return;
    }
    try {
      const file = generateBankservAcbFile({
        company: companyAccount,
        items: validation.exportableItems,
        options: {
          actionDate: new Date(`${actionDate}T12:00:00`),
          toReference,
          fromReference,
        },
      });
      const fname = `payroll-${batch?.id?.slice(0, 8) || "batch"}-${actionDate.replace(/-/g, "")}.txt`;
      await downloadFile(file, fname, "text/plain");
      showSuccess(`Bankserv ACB file downloaded (${validation.exportableItems.length} payments).`);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to generate bank file.");
    }
  };

  const handleDownloadCsv = async () => {
    if (validation.exportableItems.length === 0) {
      showError("No exportable items.");
      return;
    }
    const csv = generateGenericPaymentCsv(validation.exportableItems);
    const fname = `payment-batch-${batch?.id?.slice(0, 8) || "batch"}.csv`;
    await downloadFile(csv, fname, "text/csv");
    showSuccess("CSV downloaded for review.");
  };

  const markExported = async () => {
    if (!id) return;
    if (!validation.valid) {
      showError("Resolve validation errors before marking as exported.");
      return;
    }
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

  const errors = validation.issues.filter((i) => i.severity === "error");
  const warnings = validation.issues.filter((i) => i.severity === "warning");

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl -tracking-tight">Payment Batch</CardTitle>
            <CardDescription>
              Generate a Bankserv (ACB) file for Absa Business Online bulk payment import, then reconcile
              after upload.
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{batch.bankFormat || "Bankserv-ACB"}</Badge>
              {companyDetails?.bankName && (
                <Badge variant="secondary">Debit: {companyDetails.bankName}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleDownloadAcb} disabled={!validation.valid}>
              <Download className="h-4 w-4" />
              Download ACB file
            </Button>
            <Button variant="outline" onClick={handleDownloadCsv} disabled={validation.exportableItems.length === 0}>
              <Download className="h-4 w-4" />
              CSV (review)
            </Button>
            <Button variant="outline" onClick={markExported} disabled={!validation.valid}>
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
              <div className="text-xs text-muted-foreground">Exportable total</div>
              <div className="mt-1 text-lg font-semibold">
                R {validation.totalExportAmount.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {validation.exportableItems.length} of {items.length} items
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bank file settings</CardTitle>
              <CardDescription>
                Company debit account from Settings → Company Details. Upload the ACB file in Absa
                Business → Payments → Import (Bankserv / ACB format).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="action-date">Payment action date</Label>
                <Input
                  id="action-date"
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-ref">Beneficiary statement ref (max 20)</Label>
                <Input
                  id="to-ref"
                  maxLength={20}
                  value={toReference}
                  onChange={(e) => setToReference(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-ref">Debit statement ref (max 15)</Label>
                <Input
                  id="from-ref"
                  maxLength={15}
                  value={fromReference}
                  onChange={(e) => setFromReference(e.target.value)}
                />
              </div>
              {companyAccount && (
                <div className="sm:col-span-3 text-sm text-muted-foreground">
                  Debit from: {companyAccount.accountHolder || "—"} · branch {companyAccount.branchCode || "—"} ·
                  account {companyAccount.accountNumber || "—"}
                </div>
              )}
            </CardContent>
          </Card>

          {(errors.length > 0 || warnings.length > 0 || totals.missingBank > 0) && (
            <Alert variant={errors.length > 0 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {errors.length > 0
                  ? `${errors.length} issue(s) block export`
                  : "Review before exporting"}
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  {errors.map((e, i) => (
                    <li key={`e-${i}`}>{e.message}</li>
                  ))}
                  {warnings.map((w, i) => (
                    <li key={`w-${i}`} className="text-muted-foreground">
                      {w.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
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
                {exportItems.map((it) => {
                  const draft = drafts[it.id]?.reason || "";
                  const rowError = errors.some((e) => e.itemId === it.id);
                  return (
                    <TableRow key={it.id} className={rowError ? "bg-rose-50/50" : undefined}>
                      <TableCell>{it.employeeName}</TableCell>
                      <TableCell>{it.accountHolder || "-"}</TableCell>
                      <TableCell className={!it.accountNumber ? "text-amber-700" : ""}>
                        {it.accountNumber || "-"}
                      </TableCell>
                      <TableCell className={!it.branchCode ? "text-amber-700" : ""}>
                        {it.branchCode || "-"}
                      </TableCell>
                      <TableCell>R{Number(it.netPay).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClass(it.status)}>
                          {it.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                          <div className="w-full md:w-56">
                            <Label className="sr-only" htmlFor={`reason-${it.id}`}>
                              Reason
                            </Label>
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
