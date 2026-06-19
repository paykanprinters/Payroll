"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Activity } from "lucide-react";
import UpcomingPayrollSummaryCard from "@/components/payroll/UpcomingPayrollSummaryCard";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { differenceInCalendarDays } from "date-fns";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface DashboardSummaryCardsProps {
  employeeCount: number;
  recentPayslipCount: number;
  showUpcomingPayrollCard?: boolean;
}

const DashboardSummaryCards: React.FC<DashboardSummaryCardsProps> = ({
  employeeCount,
  recentPayslipCount,
  showUpcomingPayrollCard = true,
}) => {
  const { isMockDataEnabled, payCycleSettings, calculateSinglePayslipPreview, employees } = usePayrollProcessor();
  const [totalUpcomingPayrollAmount, setTotalUpcomingPayrollAmount] = React.useState<number>(0);
  const [upcomingPayrollDueText, setUpcomingPayrollDueText] = React.useState<string>("Loading...");

  React.useEffect(() => {
    if (payCycleSettings && employees.length > 0) {
      const today = new Date();
      const { checkDate: currentCheckDate } =
        calculatePayPeriodDetails(today, payCycleSettings.payCycleType, payCycleSettings.cutOffDay, payCycleSettings.payDayOffset);

      let totalGross = 0;
      employees.forEach(employee => {
        const employeePayCycleType = employee.payFrequency || payCycleSettings.payCycleType;
        const { payPeriodStart: employeeSpecificPeriodStart, payPeriodEnd: employeeSpecificPeriodEnd } = calculatePayPeriodDetails(
          today,
          employeePayCycleType,
          payCycleSettings.cutOffDay,
          payCycleSettings.payDayOffset
        );
        const previewPayslip = calculateSinglePayslipPreview(employee.id, employeeSpecificPeriodStart, employeeSpecificPeriodEnd);
        if (previewPayslip) {
          totalGross += previewPayslip.grossEarnings;
        }
      });
      setTotalUpcomingPayrollAmount(totalGross);

      const daysUntilDue = differenceInCalendarDays(currentCheckDate, today);
      setUpcomingPayrollDueText(daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : (daysUntilDue === 0 ? "Due Today" : "Overdue"));
    } else {
      setTotalUpcomingPayrollAmount(0);
      setUpcomingPayrollDueText("N/A");
    }
  }, [payCycleSettings, employees, calculateSinglePayslipPreview]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Employees */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
              <Users className="h-4 w-4" />
            </span>
            Total Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{employeeCount}</div>
          <p className="text-xs text-muted-foreground">
            {employeeCount > 0 ? "Active workforce" : "No employees"}
          </p>
        </CardContent>
      </Card>

      {/* Upcoming Payroll */}
      {showUpcomingPayrollCard && (
        <UpcomingPayrollSummaryCard
          totalUpcomingPayrollAmount={totalUpcomingPayrollAmount}
          dueText={upcomingPayrollDueText}
          isMockDataEnabled={isMockDataEnabled}
        />
      )}

      {/* Recent Payslips */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="emerald" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </span>
            Payslips (Total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentPayslipCount}</div>
          <p className="text-xs text-muted-foreground">Generated in the system</p>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="orange" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
              <Activity className="h-4 w-4" />
            </span>
            Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Good</div>
          <p className="text-xs text-muted-foreground">Key statutory fields captured</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSummaryCards;