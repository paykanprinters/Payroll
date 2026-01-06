"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Activity } from "lucide-react";
import UpcomingPayrollSummaryCard from "@/components/payroll/UpcomingPayrollSummaryCard";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { differenceInCalendarDays } from "date-fns";

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
  const { isMockDataEnabled, companyDetails, payCycleSettings, calculateSinglePayslipPreview, employees } = usePayrollProcessor();
  const [totalUpcomingPayrollAmount, setTotalUpcomingPayrollAmount] = React.useState<number>(0);
  const [upcomingPayrollDueText, setUpcomingPayrollDueText] = React.useState<string>("Loading...");

  React.useEffect(() => {
    if (payCycleSettings && employees.length > 0) {
      const today = new Date();
      const { checkDate: currentCheckDate, payPeriodStart: currentPeriodStart, payPeriodEnd: currentPeriodEnd } =
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{employeeCount}</div>
          <p className="text-xs text-muted-foreground">
            {isMockDataEnabled ? "+20.1% from last month (mock)" : (employeeCount > 0 ? "+20.1% from last month" : "No employees")}
          </p>
        </CardContent>
      </Card>

      {showUpcomingPayrollCard && (
        <UpcomingPayrollSummaryCard
          totalUpcomingPayrollAmount={totalUpcomingPayrollAmount}
          dueText={upcomingPayrollDueText}
          isMockDataEnabled={isMockDataEnabled}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Payslips</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentPayslipCount}</div>
          <p className="text-xs text-muted-foreground">
            {isMockDataEnabled ? "Generated this month (mock)" : "Generated this month"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Good</div>
          <p className="text-xs text-muted-foreground">
            {isMockDataEnabled ? "All regulations met (mock)" : "All regulations met"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSummaryCards;