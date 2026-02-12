"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function moneyZAR(value: number) {
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardLoansOverviewCard({
  activeCount,
  totalLoanAmount,
  totalRemaining,
  repaidPct,
}: {
  activeCount: number;
  totalLoanAmount: number;
  totalRemaining: number;
  repaidPct: number;
}) {
  const hasAny = activeCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loans & Advancements</CardTitle>
        <CardDescription>Outstanding exposure and repayment progress.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <div className="py-6 text-sm text-muted-foreground">No active loans.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-muted-foreground">Active loans</div>
                <div className="mt-1 text-2xl font-semibold -tracking-tight">{activeCount}</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-muted-foreground">Outstanding balance</div>
                <div className="mt-1 text-2xl font-semibold -tracking-tight">{moneyZAR(totalRemaining)}</div>
              </div>
              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-muted-foreground">Total advanced</div>
                <div className="mt-1 text-2xl font-semibold -tracking-tight">{moneyZAR(totalLoanAmount)}</div>
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Repayment progress</div>
                <div className="text-sm text-muted-foreground">{repaidPct.toFixed(0)}%</div>
              </div>
              <Progress value={Math.max(0, Math.min(100, repaidPct))} className="mt-3" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
