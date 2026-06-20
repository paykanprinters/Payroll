"use client";

import React, { useMemo } from "react";
import { PiggyBank } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import { formatRand } from "@/lib/staff-portal";
import { format } from "date-fns";

const StaffSavingsPage: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { savingPlans } = usePayrollProcessor();

  const myPlans = useMemo(
    () => savingPlans.filter((p) => p.employeeId === employee.id),
    [employee.id, savingPlans]
  );

  const activePlans = myPlans.filter((p) => p.status === "active");
  const totalMonthly = activePlans
    .filter((p) => p.frequency === "monthly")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My savings</h2>
        <p className="text-sm text-muted-foreground">
          Recurring savings deductions from your payslip.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-800">{activePlans.length}</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Monthly deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-800">{formatRand(totalMonthly)}</p>
          </CardContent>
        </Card>
      </div>

      {myPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No savings plans</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Contact payroll if you want to start a savings deduction.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Savings plans</CardTitle>
            <CardDescription>Your registered savings arrangements</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="capitalize">{plan.frequency}</TableCell>
                    <TableCell className="font-medium">{formatRand(plan.amount)}</TableCell>
                    <TableCell>{format(new Date(plan.startDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffSavingsPage;
