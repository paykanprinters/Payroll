"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { fetchPaymentBatches, PaymentBatch } from "@/integrations/supabase/payment-batch-queries";

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Batches</CardTitle>
        </CardHeader>
        <CardContent>
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
              {batches.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell>
                  <TableCell className="font-mono text-xs">{b.runId}</TableCell>
                  <TableCell>{b.bankFormat}</TableCell>
                  <TableCell>{b.totalItems}</TableCell>
                  <TableCell>R{Number(b.totalAmount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => navigate(`/payroll/batches/${b.id}`)}>Open</Button>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentBatchesPage;