"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { DollarSign, Wallet, ReceiptText } from "lucide-react";

interface Props {
  gross: number;
  net: number;
  count: number;
}

const formatCurrencyZAR = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

const PayslipsSummaryCards: React.FC<Props> = ({ gross, net, count }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
              <DollarSign className="h-4 w-4" />
            </span>
            Total Gross Payroll (Filtered)
          </CardTitle>
          <CardDescription className="text-xs">Sum of gross earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyZAR(gross)}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </span>
            Total Net Payroll (Filtered)
          </CardTitle>
          <CardDescription className="text-xs">Sum of net pay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyZAR(net)}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
              <ReceiptText className="h-4 w-4" />
            </span>
            Payslips Shown
          </CardTitle>
          <CardDescription className="text-xs">Filtered count vs total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{count}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipsSummaryCards;