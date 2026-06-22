"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface UpcomingPayrollSummaryCardProps {
  totalUpcomingPayrollAmount: number;
  dueText: string;
  isMockDataEnabled: boolean;
  postedThisMonthGross?: number;
}

const UpcomingPayrollSummaryCard: React.FC<UpcomingPayrollSummaryCardProps> = ({
  totalUpcomingPayrollAmount,
  dueText,
  postedThisMonthGross,
}) => {
  return (
    <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <SummaryAccent variant="amber" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600">
            <DollarSign className="h-4 w-4" />
          </span>
          Upcoming Payroll
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          R {totalUpcomingPayrollAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
        </div>
        <p className="text-xs text-muted-foreground">{dueText}</p>
        {postedThisMonthGross != null && postedThisMonthGross > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Posted this month: R{" "}
            {postedThisMonthGross.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingPayrollSummaryCard;