"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, differenceInCalendarDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, getDay, getDate, setDate, setDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import CalculatePaycheckDialog from "./CalculatePaycheckDialog";
import { PayslipDesignSettings, MockEmployee, MockCompanyDetails, MockPayslip } from "@/lib/mock-data-interfaces";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";

interface PayrollRunCardProps {
  employees: MockEmployee[];
  companyDetails: MockCompanyDetails | null;
  payCycleType: "Monthly" | "Weekly" | "Bi-Weekly";
  cutOffDay: number;
  payDayOffset: number;
  runPayrollProcess: (periodStart: Date, periodEnd: Date) => Promise<void>;
  calculateSinglePayslipPreview: (employeeId: string, periodStart: Date, periodEnd: Date) => MockPayslip | null;
  payslipDesignSettings: PayslipDesignSettings;
}

const PayrollRunCard: React.FC<PayrollRunCardProps> = ({
  employees,
  companyDetails,
  payCycleType,
  cutOffDay,
  payDayOffset,
  runPayrollProcess,
  calculateSinglePayslipPreview,
  payslipDesignSettings,
}) => {
  const navigate = useNavigate();
  const [currentDateForCalculation, setCurrentDateForCalculation] = useState<Date>(new Date());
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payPeriodStart, setPayPeriodStart] = useState<Date>(new Date());
  const [payPeriodEnd, setPayPeriodEnd] = useState<Date>(new Date());
  const [isCalculatePaycheckDialogOpen, setIsCalculatePaycheckDialogOpen] = useState(false);

  // Effect to update pay period and check date when settings or current date change
  useEffect(() => {
    const { checkDate: newCheckDate, payPeriodStart: newPayPeriodStart, payPeriodEnd: newPayPeriodEnd } =
      calculatePayPeriodDetails(
        currentDateForCalculation,
        payCycleType,
        cutOffDay,
        payDayOffset
      );
    setCheckDate(newCheckDate);
    setPayPeriodStart(newPayPeriodStart);
    setPayPeriodEnd(newPayPeriodEnd);
  }, [payCycleType, cutOffDay, payDayOffset, currentDateForCalculation]);

  const handlePreviousPeriod = () => {
    let newCurrentDate = currentDateForCalculation;
    if (payCycleType === "Monthly") {
      newCurrentDate = subMonths(newCurrentDate, 1);
    } else if (payCycleType === "Weekly") {
      newCurrentDate = subWeeks(newCurrentDate, 1);
    } else if (payCycleType === "Bi-Weekly") {
      newCurrentDate = subWeeks(newCurrentDate, 2);
    }
    setCurrentDateForCalculation(newCurrentDate);
  };

  const handleNextPeriod = () => {
    let newCurrentDate = currentDateForCalculation;
    if (payCycleType === "Monthly") {
      newCurrentDate = addMonths(newCurrentDate, 1);
    } else if (payCycleType === "Weekly") {
      newCurrentDate = addWeeks(newCurrentDate, 1);
    } else if (payCycleType === "Bi-Weekly") {
      newCurrentDate = addWeeks(newCurrentDate, 2);
    }
    setCurrentDateForCalculation(newCurrentDate);
  };

  const handleRunPayroll = () => {
    runPayrollProcess(payPeriodStart, payPeriodEnd);
    // After running payroll, advance to the next period for display
    handleNextPeriod();
  };

  const handleNewOffCyclePayroll = () => {
    showSuccess("Starting new off-cycle payroll. Redirecting to Payslips page.");
    navigate("/payslips/overview");
  };

  const handleCalculatePaycheck = () => {
    if (!companyDetails) {
      showError("Company details are not loaded. Cannot calculate paycheck.");
      return;
    }
    setIsCalculatePaycheckDialogOpen(true);
  };

  const daysUntilDue = differenceInCalendarDays(checkDate, new Date());
  const dueText = daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : (daysUntilDue === 0 ? "Due Today" : "Overdue");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Run</CardTitle>
        <CardDescription>Manage your upcoming payroll cycle and perform quick actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{payCycleType}</h3>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                {dueText}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePreviousPeriod}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-4">
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Check date</p>
                  <p className="font-semibold text-lg">{format(checkDate, "MM/dd/yyyy")}</p>
                </div>
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-sm text-muted-foreground">Pay period</p>
                  <p className="font-semibold text-lg">{format(payPeriodStart, "MM/dd")} &rarr; {format(payPeriodEnd, "MM/dd")}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextPeriod}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleRunPayroll} className="w-full">
              Run payroll
            </Button>
          </div>

          <div className="lg:col-span-1 space-y-4 border-t lg:border-t-0 lg:border-l pt-6 lg:pt-0 lg:pl-6 border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold">Payroll actions</h4>
            <Button variant="outline" onClick={handleNewOffCyclePayroll} className="w-full">
              New off-cycle payroll
            </Button>
            <Button variant="outline" onClick={handleCalculatePaycheck} className="w-full">
              Calculate paycheck
            </Button>
          </div>
        </div>
      </CardContent>
      <CalculatePaycheckDialog
        isOpen={isCalculatePaycheckDialogOpen}
        onClose={() => setIsCalculatePaycheckDialogOpen(false)}
        payslipDesignSettings={payslipDesignSettings}
      />
    </Card>
  );
};

export default PayrollRunCard;