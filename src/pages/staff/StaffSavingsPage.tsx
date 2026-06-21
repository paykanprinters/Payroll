"use client";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, PauseCircle, PiggyBank, ReceiptText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import { buildStaffSavingsSummary, StaffSavingsPlanRow } from "@/lib/staff-savings-summary";
import { formatRand, staffPortalPath } from "@/lib/staff-portal";
import { format } from "date-fns";

const StaffSavingsPage: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const {
    savingPlans,
    payrollSavingsEntries,
    payslips,
    isLoadingSavingPlans,
    isLoadingPayrollSavingsEntries,
  } = usePayrollProcessor();

  const isLoading = isLoadingSavingPlans || isLoadingPayrollSavingsEntries;

  const summary = useMemo(
    () => buildStaffSavingsSummary(employee, savingPlans, payrollSavingsEntries, payslips),
    [employee, savingPlans, payrollSavingsEntries, payslips]
  );

  const payFrequencyLabel = employee.payFrequency?.toLowerCase() ?? "pay period";

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading savings" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My savings</h2>
          <p className="text-sm text-muted-foreground">
            Recurring payslip deductions, amounts saved to date, and your plan status.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-cyan-200 shrink-0">
          <Link to={staffPortalPath("payslips")}>
            <ReceiptText className="mr-2 h-4 w-4" />
            View payslip deductions
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-800">{formatRand(summary.totalSaved)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              From payroll tracking or payslip &quot;Savings&quot; lines
            </p>
          </CardContent>
        </Card>
        <Card className="border-cyan-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Per {payFrequencyLabel} deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-800">
              {formatRand(summary.perPaycheckDeductions)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Active, non-paused plans aligned to your pay cycle
            </p>
          </CardContent>
        </Card>
        <Card className="border-fuchsia-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-fuchsia-800">{summary.activePlanCount}</p>
            {summary.pausedPlanCount > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {summary.pausedPlanCount} paused — not deducting right now
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {summary.pausedPlanCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50/80">
          <PauseCircle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Savings paused</AlertTitle>
          <AlertDescription className="text-amber-800/90">
            One or more plans are paused by payroll. Deductions resume when the plan is unpaused or
            the next payment date is reached.
          </AlertDescription>
        </Alert>
      )}

      {summary.plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No savings plans</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Contact payroll if you want to start a recurring savings deduction from your payslip.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Savings plans</CardTitle>
            <CardDescription>
              Schedule, progress, and status for each arrangement on your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Deduction</TableHead>
                  <TableHead>Saved to date</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.plans.map((row) => (
                  <PlanRow key={row.plan.id} row={row} payFrequencyLabel={payFrequencyLabel} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {summary.recentDeductions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent payslip deductions</CardTitle>
            <CardDescription>
              &quot;Savings&quot; lines from your processed payslips — matches what payroll deducted
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay period</TableHead>
                  <TableHead>Pay date</TableHead>
                  <TableHead className="text-right">Deducted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentDeductions.map((row) => (
                  <TableRow key={row.payslipId}>
                    <TableCell className="font-medium">{row.payPeriod}</TableCell>
                    <TableCell>
                      {row.payDate ? format(new Date(row.payDate), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-800">
                      {formatRand(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Savings deductions use the same rules as payroll processing — including frequency matching
          and any pause set by payroll. Amounts on your payslip are the source of truth each pay
          period. Contact payroll to start, change, pause, or stop a savings plan.
        </CardContent>
      </Card>
    </div>
  );
};

function PlanRow({
  row,
  payFrequencyLabel,
}: {
  row: StaffSavingsPlanRow;
  payFrequencyLabel: string;
}) {
  const { plan, effectiveAmount, perPaycheckAmount, amountPaid, remainingBalance, isPaused } = row;
  const hasOverride =
    row.entry?.overrideAmount != null && row.entry.overrideAmount !== row.entry.originalAmount;

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium capitalize">{plan.frequency} plan</p>
        <p className="text-xs text-muted-foreground">
          From {format(new Date(plan.startDate), "dd MMM yyyy")}
        </p>
      </TableCell>
      <TableCell>
        <p className="font-medium">{formatRand(effectiveAmount)}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {plan.frequency}
          {hasOverride ? " · payroll adjusted" : ""}
        </p>
        {plan.status === "active" && !isPaused && perPaycheckAmount > 0 && (
          <p className="text-xs text-cyan-700">
            ≈ {formatRand(perPaycheckAmount)} / {payFrequencyLabel}
          </p>
        )}
      </TableCell>
      <TableCell>{amountPaid != null ? formatRand(amountPaid) : "—"}</TableCell>
      <TableCell>
        {remainingBalance != null ? formatRand(remainingBalance) : "—"}
      </TableCell>
      <TableCell>
        {plan.endDate ? format(new Date(plan.endDate), "dd MMM yyyy") : "Ongoing"}
      </TableCell>
      <TableCell>
        <PlanStatusBadge row={row} />
      </TableCell>
    </TableRow>
  );
}

function PlanStatusBadge({ row }: { row: StaffSavingsPlanRow }) {
  const label = row.isPaused ? "paused" : row.displayStatus;

  const variant =
    row.displayStatus === "completed" || row.displayStatus === "paid"
      ? "secondary"
      : row.isPaused
        ? "outline"
        : "default";

  return (
    <Badge variant={variant} className="capitalize">
      {label}
      {row.isPaused && <PauseCircle className="ml-1 inline h-3 w-3" aria-label="Paused" />}
    </Badge>
  );
}

export default StaffSavingsPage;
