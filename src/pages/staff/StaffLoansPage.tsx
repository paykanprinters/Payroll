"use client";

import React, { useMemo } from "react";
import { HandCoins, PauseCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useStaffPortalContext } from "@/hooks/use-staff-portal-context";
import { formatRand } from "@/lib/staff-portal";
import { format } from "date-fns";

const StaffLoansPage: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { loans } = usePayrollProcessor();

  const myLoans = useMemo(
    () => loans.filter((l) => l.employeeId === employee.id),
    [employee.id, loans]
  );

  const activeLoans = myLoans.filter((l) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My loans</h2>
        <p className="text-sm text-muted-foreground">
          Outstanding balances and repayment schedules deducted from your payslip.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-800">{formatRand(totalOutstanding)}</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active loans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-800">{activeLoans.length}</p>
          </CardContent>
        </Card>
      </div>

      {myLoans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <HandCoins className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No loans on your account</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Loan history</CardTitle>
            <CardDescription>Read-only view of your loan records</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Repayment</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.loanType}</TableCell>
                    <TableCell>{format(new Date(loan.startDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {formatRand(loan.repaymentAmount)} / {loan.frequency}
                    </TableCell>
                    <TableCell>{formatRand(loan.remainingBalance)}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                        {loan.status}
                        {loan.paused && (
                          <PauseCircle className="ml-1 inline h-3 w-3" aria-label="Paused" />
                        )}
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

export default StaffLoansPage;
