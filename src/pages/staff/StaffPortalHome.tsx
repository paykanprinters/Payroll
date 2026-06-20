"use client";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ReceiptText,
  HandCoins,
  PiggyBank,
  CalendarDays,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import { formatRand, staffPortalPath } from "@/lib/staff-portal";
import { calculateLeaveSummary } from "@/lib/leave-summary";
import { startOfYear, endOfYear } from "date-fns";

const StaffPortalHome: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { payslips, loans, savingPlans, leaveRecords } = usePayrollProcessor();

  const myPayslips = useMemo(
    () =>
      [...payslips.filter((p) => p.employeeId === employee.id)].sort((a, b) =>
        b.payPeriod.localeCompare(a.payPeriod)
      ),
    [employee.id, payslips]
  );

  const latestPayslip = myPayslips[0];

  const activeLoans = useMemo(
    () => loans.filter((l) => l.employeeId === employee.id && l.status === "active"),
    [employee.id, loans]
  );

  const loanOutstanding = activeLoans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

  const activeSavings = useMemo(
    () => savingPlans.filter((s) => s.employeeId === employee.id && s.status === "active"),
    [employee.id, savingPlans]
  );

  const monthlySavings = activeSavings
    .filter((s) => s.frequency === "monthly")
    .reduce((sum, s) => sum + s.amount, 0);

  const leaveSummary = useMemo(() => {
    const now = new Date();
    return calculateLeaveSummary(
      employee,
      leaveRecords,
      startOfYear(now),
      endOfYear(now),
      0
    );
  }, [employee, leaveRecords]);

  const ytdNet = myPayslips.reduce((sum, p) => sum + (p.netPay || 0), 0);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-600 via-cyan-700 to-fuchsia-700 p-6 text-white shadow-lg md:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/75">Welcome back</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
            {employee.firstName}, here is your payroll snapshot
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            View payslips, track loan repayments, savings deductions, and leave balances — all scoped to
            your employee record.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Latest payslip"
          value={latestPayslip ? formatRand(latestPayslip.netPay) : "—"}
          hint={latestPayslip ? `Period ${latestPayslip.payPeriod}` : "No payslips yet"}
          icon={ReceiptText}
          accent="cyan"
        />
        <StatCard
          title="YTD net pay"
          value={formatRand(ytdNet)}
          hint={`${myPayslips.length} payslip${myPayslips.length === 1 ? "" : "s"} this year`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          title="Loan balance"
          value={formatRand(loanOutstanding)}
          hint={`${activeLoans.length} active loan${activeLoans.length === 1 ? "" : "s"}`}
          icon={HandCoins}
          accent="amber"
        />
        <StatCard
          title="Annual leave left"
          value={`${Math.max(0, leaveSummary.annual)} days`}
          hint={`Sick leave: ${Math.max(0, leaveSummary.sick)} days`}
          icon={CalendarDays}
          accent="fuchsia"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-cyan-100 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent payslips</CardTitle>
              <CardDescription>Your latest pay periods</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="border-cyan-200">
              <Link to={staffPortalPath("payslips")}>
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {myPayslips.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payslips have been published yet. They will appear here after payroll is processed.
              </p>
            ) : (
              myPayslips.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{p.payPeriod}</p>
                    <p className="text-xs text-muted-foreground">Paid {p.payDate || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-cyan-800">{formatRand(p.netPay)}</p>
                    <p className="text-xs text-muted-foreground">Net pay</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-cyan-100 lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Jump to your self-service areas</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <QuickLink to={staffPortalPath("payslips")} icon={ReceiptText} label="Payslips" />
            <QuickLink to={staffPortalPath("leave")} icon={CalendarDays} label="Leave & absence" />
            <QuickLink to={staffPortalPath("savings")} icon={PiggyBank} label="Savings" />
            <QuickLink to={staffPortalPath("loans")} icon={HandCoins} label="Loans" />
          </CardContent>
        </Card>
      </div>

      {(activeLoans.length > 0 || activeSavings.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {activeLoans.length > 0 && (
            <Card className="border-amber-100">
              <CardHeader>
                <CardTitle className="text-lg">Outstanding loans</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div>
                      <p className="font-medium">{loan.loanType}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.frequency} · R {loan.repaymentAmount.toFixed(2)} / period
                      </p>
                    </div>
                    <Badge variant={loan.paused ? "secondary" : "outline"}>
                      {formatRand(loan.remainingBalance)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSavings.length > 0 && (
            <Card className="border-emerald-100">
              <CardHeader>
                <CardTitle className="text-lg">Active savings</CardTitle>
                <CardDescription>
                  {monthlySavings > 0
                    ? `${formatRand(monthlySavings)} deducted monthly`
                    : "Recurring savings plans"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSavings.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <p className="text-sm capitalize">{plan.frequency} plan</p>
                    <p className="font-semibold">{formatRand(plan.amount)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  accent: "cyan" | "emerald" | "amber" | "fuchsia";
}) {
  const accentMap = {
    cyan: "border-cyan-100",
    emerald: "border-emerald-100",
    amber: "border-amber-100",
    fuchsia: "border-fuchsia-100",
  } as const;

  return (
    <Card className={accentMap[accent]}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 opacity-70" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Button asChild variant="ghost" className="h-11 w-full justify-start rounded-xl hover:bg-cyan-50">
      <Link to={to}>
        <Icon className="mr-2 h-4 w-4 text-cyan-700" />
        {label}
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </Link>
    </Button>
  );
}

export default StaffPortalHome;
