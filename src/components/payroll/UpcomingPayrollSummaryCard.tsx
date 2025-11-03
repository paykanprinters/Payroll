"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

interface UpcomingPayrollSummaryCardProps {
  totalUpcomingPayrollAmount: number;
  dueText: string;
  isMockDataEnabled: boolean;
}

const UpcomingPayrollSummaryCard: React.FC<UpcomingPayrollSummaryCardProps> = ({
  totalUpcomingPayrollAmount,
  dueText,
  isMockDataEnabled,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Payroll</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">R {totalUpcomingPayrollAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
        <p className="text-xs text-muted-foreground">
          {dueText}
        </p>
      </CardContent>
    </Card>
  );
};

export default UpcomingPayrollSummaryCard;