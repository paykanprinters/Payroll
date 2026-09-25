"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  ListTodo,
  Clock,
  ShieldCheck,
} from "lucide-react";
import UpcomingPayrollSummaryCard from "@/components/payroll/UpcomingPayrollSummaryCard";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { differenceInCalendarDays } from "date-fns";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import type { DashboardAdminSummary } from "@/lib/dashboard-admin-summary";

interface DashboardSummaryCardsProps {
  summary: DashboardAdminSummary;
  showUpcomingPayrollCard?: boolean;
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  summary,
  showUpcomingPayrollCard = true,
}) => {
  const {
    isMockDataEnabled,
    payCycleSettings,
    calculateSinglePayslipPreview,
    employees,
    isLoadingTaxTables,
    isTaxTablesReady,
    userTaxSettings,
    isLoadingUserTaxSettings,
  } = usePayrollProcessor();
  const [totalUpcomingPayrollAmount, setTotalUpcomingPayrollAmount] = React.useState(0);
  const [upcomingPayrollDueText, setUpcomingPayrollDueText] = React.useState("Calculating…");

  React.useEffect(() => {
    if (!payCycleSettings || employees.length === 0) {
      setTotalUpcomingPayrollAmount(0);
      setUpcomingPayrollDueText("Configure pay cycle");
      return;
    }

    // Wait for tax tables / settings — auto-preview must not toast during the normal load race.
    if (isLoadingTaxTables || isLoadingUserTaxSettings) {
      setUpcomingPayrollDueText("Calculating…");
      return;
    }

    if (!isTaxTablesReady || !userTaxSettings) {
      setTotalUpcomingPayrollAmount(0);
      setUpcomingPayrollDueText(
        !isTaxTablesReady ? "Tax tables required" : "Tax settings required"
      );
      return;
    }

    const today = new Date();
    const { checkDate: currentCheckDate } = calculatePayPeriodDetails(
      today,
      payCycleSettings.payCycleType,
      payCycleSettings.cutOffDay,
      payCycleSettings.payDayOffset
    );

    let totalGross = 0;
    employees.forEach((employee) => {
      const employeePayCycleType = employee.payFrequency || payCycleSettings.payCycleType;
      const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
        today,
        employeePayCycleType,
        payCycleSettings.cutOffDay,
        payCycleSettings.payDayOffset
      );
      const previewPayslip = calculateSinglePayslipPreview(
        employee.id,
        payPeriodStart,
        payPeriodEnd
      );
      if (previewPayslip) {
        totalGross += previewPayslip.grossEarnings;
      }
    });
    setTotalUpcomingPayrollAmount(totalGross);

    const daysUntilDue = differenceInCalendarDays(currentCheckDate, today);
    setUpcomingPayrollDueText(
      daysUntilDue > 0
        ? `Pay date in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`
        : daysUntilDue === 0
          ? "Pay date today"
          : "Pay date passed"
    );
  }, [
    payCycleSettings,
    employees,
    calculateSinglePayslipPreview,
    isLoadingTaxTables,
    isTaxTablesReady,
    isLoadingUserTaxSettings,
    userTaxSettings,
  ]);

  const setupComplete = summary.setupReadyCount === summary.setupTotal;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-sky-600" />
            Employees
          </CardTitle>
          <CardDescription className="text-xs">Active workforce</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.employeeCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Still employed today. Resigned and terminated staff are excluded once their last day has passed.
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="amber" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4 text-amber-600" />
            Open tasks
          </CardTitle>
          <CardDescription className="text-xs">Payroll to-dos pending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.pendingTodoCount}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-emerald-600" />
            Timesheets
          </CardTitle>
          <CardDescription className="text-xs">Draft or submitted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.timesheetsAwaitingAction}</div>
        </CardContent>
      </Card>

      {showUpcomingPayrollCard ? (
        <UpcomingPayrollSummaryCard
          totalUpcomingPayrollAmount={totalUpcomingPayrollAmount}
          dueText={upcomingPayrollDueText}
          isMockDataEnabled={isMockDataEnabled}
          postedThisMonthGross={summary.currentMonthGrossPayroll}
        />
      ) : (
        <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
          <SummaryAccent variant={setupComplete ? "emerald" : "orange"} />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-orange-600" />
              Setup status
            </CardTitle>
            <CardDescription className="text-xs">Company, pay cycle, tax</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.setupReadyCount}/{summary.setupTotal}
            </div>
            <p className="text-xs text-muted-foreground">
              {setupComplete ? "Ready for payroll" : "Complete setup in Settings"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardSummaryCards;
