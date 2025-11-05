"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { Separator } from "@/components/ui/separator";

interface Props {
  payslip: MockPayslip;
  employeeName?: string;
}

const currency = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const IndividualPayslipCard: React.FC<Props> = ({ payslip, employeeName }) => {
  const { earningsBreakdown, deductionsBreakdown } = payslip;

  const earningsTotal = useMemo(
    () => earningsBreakdown.reduce((sum, e) => sum + (e?.amount || 0), 0),
    [earningsBreakdown]
  );

  const deductionsTotal = useMemo(
    () => deductionsBreakdown.reduce((sum, d) => sum + (d?.amount || 0), 0),
    [deductionsBreakdown]
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">
          Payslip {employeeName ? `• ${employeeName}` : ""} — {payslip.payPeriod}
        </CardTitle>
        <div className="text-sm text-muted-foreground">Pay Date: {payslip.payDate}</div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings */}
          <div className="rounded-md border p-4">
            <div className="font-semibold mb-2">Earnings</div>
            <div className="space-y-2">
              {earningsBreakdown.map((e, idx) => (
                <div key={`${e.name}-${idx}`} className="flex items-center justify-between">
                  <span className="text-sm">{e.name}</span>
                  <span className="text-sm font-medium">{currency(e.amount)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Earnings</span>
              <span className="text-sm font-semibold">{currency(earningsTotal)}</span>
            </div>
          </div>

          {/* Deductions (includes PAYE/UIF/SDL + Loans + Savings) */}
          <div className="rounded-md border p-4">
            <div className="font-semibold mb-2">Deductions</div>
            <div className="space-y-2">
              {deductionsBreakdown.length > 0 ? (
                deductionsBreakdown.map((d, idx) => (
                  <div key={`${d.name}-${idx}`} className="flex items-center justify-between">
                    <span className="text-sm">{d.name}</span>
                    <span className="text-sm font-medium">{currency(d.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No deductions for this period.</div>
              )}
            </div>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Deductions</span>
              <span className="text-sm font-semibold">{currency(deductionsTotal)}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Gross Earnings</span>
            <span className="text-sm">{currency(payslip.grossEarnings)}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium">Total Deductions</span>
            <span className="text-sm">{currency(payslip.totalDeductions)}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Net Pay</span>
            <span className="text-base font-bold">{currency(payslip.netPay)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IndividualPayslipCard;