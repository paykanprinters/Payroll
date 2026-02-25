"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { fetchPaymentBatches, PaymentBatch } from "@/integrations/supabase/payment-batch-queries";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { Landmark } from "lucide-react";

const PaymentBatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<PaymentBatch[]>([]);

  useEffect(() => {
    const load = async () => {
      const list = await fetchPaymentBatches();
      setBatches(list);
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const total = batches.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
    const count = batches.length;
    const pending = batches.filter((b) => b.status === "Pending").length;
    const exported = batches.filter((b) => b.status === "Exported").length;
    const reconciled = batches.filter((b) => b.status === "Reconciled").length;
    return { total, count, pending, exported, reconciled };
  }, [batches]);

  const statusBadgeClass = (status: string) => {
    if (status === "Reconciled") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "Exported") return "bg-sky-50 text-sky-700 border-sky-200";
    if (status === "Pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "";
  };

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl -tracking-tight">Payment Batches</CardTitle>
            <div className="text-sm text-muted-foreground">
              Generate bank files and reconcile payments per payroll run.
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <Landmark className="h-4 w-4" />
            <span>{totals.count} total</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Total amount</div>
              <div className="mt-1 text-xl font-semibold">R {totals.total.toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="mt-1 text-xl font-semibold">{totals.pending}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Exported</div>
              <div className="mt-1 text-xl font-semibold">{totals.exported}</div>
            </div>
            <div className="rounded-2xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">Reconciled</div>
              <div className="mt-1 text-xl font-semibold">{totals.reconciled}</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Related Run</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Total Items</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.id}</TableCell>
                    <TableCell className="font-mono text-xs">{b.runId}</TableCell>
                    <TableCell>{b.bankFormat}</TableCell>
                    <TableCell>{b.totalItems}</TableCell>
                    <TableCell>R {Number(b.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass(b.status)}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => navigate(`/payroll/batches/${b.id}`)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {batches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No payment batches yet.
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

export default PaymentBatchesPage;