"use client";

import React from "react";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Props {
  payslips: MockPayslip[];
  getEmployeeName: (id: string) => string;
}

const currency = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BulkPayslipsRenderer: React.FC<Props> = ({ payslips, getEmployeeName }) => {
  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
      {payslips.map((p) => (
        <Card key={p.id} className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {getEmployeeName(p.employeeId)} — {p.payPeriod}
            </CardTitle>
            <div className="text-xs text-muted-foreground">Pay Date: {p.payDate}</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2 text-sm">Earnings</div>
                <div className="space-y-1">
                  {p.earningsBreakdown.map((e, idx) => (
                    <div key={`${e.name}-${idx}`} className="flex items-center justify-between text-sm">
                      <span>{e.name}</span>
                      <span className="font-medium">{currency(e.amount)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Earnings</span>
                  <span className="font-semibold">{currency(p.grossEarnings)}</span>
                </div>
              </div>

              {/* Deductions (includes Loans and Savings lines) */}
              <div className="rounded-md border p-3">
                <div className="font-semibold mb-2 text-sm">Deductions</div>
                <div className="space-y-1">
                  {p.deductionsBreakdown.length > 0 ? (
                    p.deductionsBreakdown.map((d, idx) => (
                      <div key={`${d.name}-${idx}`} className="flex items-center justify-between text-sm">
                        <span>{d.name}</span>
                        <span className="font-medium">{currency(d.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">No deductions</div>
                  )}
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Deductions</span>
                  <span className="font-semibold">{currency(p.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Gross Earnings</span>
                <span>{currency(p.grossEarnings)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="font-medium">Total Deductions</span>
                <span>{currency(p.totalDeductions)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Net Pay</span>
                <span className="text-base font-bold">{currency(p.netPay)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BulkPayslipsRenderer;