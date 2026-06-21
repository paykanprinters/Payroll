"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { ReceiptText, Wallet, MinusCircle, Banknote } from "lucide-react";

interface Props {
  gross: number;
  net: number;
  deductions: number;
  count: number;
  uniqueEmployees: number;
  staffView?: boolean;
}

const formatCurrencyZAR = (n: number) =>
  `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PayslipsSummaryCards: React.FC<Props> = ({
  gross,
  net,
  deductions,
  count,
  uniqueEmployees,
  staffView = false,
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ReceiptText className="h-4 w-4 text-sky-600" />
            In view
          </CardTitle>
          <CardDescription className="text-xs">
            {staffView
              ? `${count} payslip${count === 1 ? "" : "s"} on your profile`
              : `${uniqueEmployees} employee${uniqueEmployees === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{count}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Banknote className="h-4 w-4 text-emerald-600" />
            {staffView ? "Gross earnings" : "Gross payroll"}
          </CardTitle>
          <CardDescription className="text-xs">Filtered total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyZAR(gross)}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Wallet className="h-4 w-4 text-orange-600" />
            {staffView ? "Net pay" : "Net payroll"}
          </CardTitle>
          <CardDescription className="text-xs">After deductions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyZAR(net)}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="amber" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MinusCircle className="h-4 w-4 text-amber-600" />
            Deductions
          </CardTitle>
          <CardDescription className="text-xs">Statutory and other</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyZAR(deductions)}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipsSummaryCards;
