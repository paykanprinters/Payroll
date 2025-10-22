"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, differenceInCalendarDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths, getDay, getDate, setDate, setDay } from "date-fns";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useNavigate } from "react-router-dom";
import CalculatePaycheckDialog from "./CalculatePaycheckDialog";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { PayCycleSettings } from "@/integrations/supabase/pay-cycle-queries"; // Import PayCycleSettings

const defaultPayslipSettings: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true,
  showBankDetails: true,
  showYTD: true,
  showHourlyRate: true,
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
  payslipLogoUrl: '',
  payslipLogoWidth: 100,
  payslipLogoHeight: 50,
  payslipLogoFit: 'contain',
};

// Helper function to calculate pay period and check date based on settings
const calculatePayPeriodAndCheckDate = (
  currentDate: Date,
  settings: PayCycleSettings
): { checkDate: Date; payPeriodStart: Date; payPeriodEnd: Date } => {
  let payPeriodEnd: Date;
  let checkDate: Date;

  const today = new Date();

  if (settings.payCycleType === "Monthly") {
    // For monthly, cut-off day is a day of the month (1-31)
    let cutOffDateThisMonth = setDate(currentDate, settings.cutOffDay);
    
    // If cut-off day is in the future, use this month's cut-off
    // If cut-off day is in the past, use next month's cut-off
    if (cutOffDateThisMonth < today && getDate(currentDate) > settings.cutOffDay) {
      cutOffDateThisMonth = addMonths(cutOffDateThisMonth, 1);
    } else if (cutOffDateThisMonth > today && getDate(currentDate) > settings.cutOffDay) {
      // If current date is after cut-off day, but cut-off date is still in the future (e.g., today is 26th, cut-off is 28th)
      // This means the current period's cut-off is still this month.
    } else if (cutOffDateThisMonth < today && getDate(currentDate) <= settings.cutOffDay) {
      // If current date is before or on cut-off day, but cut-off date is in the past (e.g., today is 2nd, cut-off is 28th last month)
      // This means the current period's cut-off is last month.
      cutOffDateThisMonth = subMonths(cutOffDateThisMonth, 1);
    }

    payPeriodEnd = cutOffDateThisMonth;
    checkDate = addDays(payPeriodEnd, settings.payDayOffset);
    
    // Adjust payPeriodStart to be the day after the previous cut-off
    let previousCutOffDate = subMonths(payPeriodEnd, 1);
    previousCutOffDate = setDate(previousCutOffDate, settings.cutOffDay);
    const payPeriodStart = addDays(previousCutOffDate, 1);

    return { checkDate, payPeriodStart, payPeriodEnd };

  } else if (settings.payCycleType === "Weekly" || settings.payCycleType === "Bi-Weekly") {
    // For weekly/bi-weekly, cut-off day is a day of the week (1=Mon, 7=Sun)
    // date-fns getDay returns 0=Sun, 1=Mon, ..., 6=Sat. We need to convert settings.cutOffDay (1=Mon, 7=Sun)
    const targetDayOfWeek = settings.cutOffDay === 7 ? 0 : settings.cutOffDay; // Convert 7 (Sunday) to 0 for date-fns

    let currentCutOffDay = setDay(currentDate, targetDayOfWeek, { weekStartsOn: 1 }); // weekStartsOn: 1 means Monday is 1

    // If the currentCutOffDay is in the past relative to today, move to next week
    if (currentCutOffDay < today && getDay(currentDate) > targetDayOfWeek) {
      currentCutOffDay = addWeeks(currentCutOffDay, 1);
    } else if (currentCutOffDay > today && getDay(currentDate) > targetDayOfWeek) {
      // If current date is after cut-off day, but cut-off date is still in the future (e.g., today is Sat, cut-off is Fri next week)
      // This means the current period's cut-off is still this week.
    } else if (currentCutOffDay < today && getDay(currentDate) <= targetDayOfWeek) {
      // If current date is before or on cut-off day, but cut-off date is in the past (e.g., today is Mon, cut-off is Fri last week)
      // This means the current period's cut-off is last week.
      currentCutOffDay = subWeeks(currentCutOffDay, 1);
    }

    payPeriodEnd = currentCutOffDay;
    checkDate = addDays(payPeriodEnd, settings.payDayOffset);

    let payPeriodStart: Date;
    if (settings.payCycleType === "Weekly") {
      payPeriodStart = addDays(subWeeks(payPeriodEnd, 1), 1); // Day after previous cut-off
    } else { // Bi-Weekly
      payPeriodStart = addDays(subWeeks(payPeriodEnd, 2), 1); // Day after previous bi-weekly cut-off
    }
    
    return { checkDate, payPeriodStart, payPeriodEnd };
  }

  // Fallback to a default weekly if settings are invalid or not found
  const defaultCheckDate = addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 4); // Default to Friday
  const defaultPayPeriodEnd = defaultCheckDate;
  const defaultPayPeriodStart = subDays(defaultPayPeriodEnd, 6);
  return { checkDate: defaultCheckDate, payPeriodStart: defaultPayPeriodStart, payPeriodEnd: defaultPayPeriodEnd };
};


const UpcomingPayrollCard: React.FC = () => {
  const navigate = useNavigate();
  const { runPayrollProcess, companyDetails, payCycleSettings, isLoadingPayCycleSettings } = usePayrollProcessor(); // Get payCycleSettings

  const [currentDateForCalculation, setCurrentDateForCalculation] = useState<Date>(new Date());
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payPeriodStart, setPayPeriodStart] = useState<Date>(new Date());
  const [payPeriodEnd, setPayPeriodEnd] = useState<Date>(new Date());
  const [isCalculatePaycheckDialogOpen, setIsCalculatePaycheckDialogOpen] = useState(false);
  const [payslipDesignSettings, setPayslipDesignSettings] = useState<PayslipDesignSettings>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings;
  });

  // Effect to update pay period and check date when settings or current date change
  useEffect(() => {
    if (payCycleSettings) {
      const { checkDate: newCheckDate, payPeriodStart: newPayPeriodStart, payPeriodEnd: newPayPeriodEnd } =
        calculatePayPeriodAndCheckDate(currentDateForCalculation, payCycleSettings);
      setCheckDate(newCheckDate);
      setPayPeriodStart(newPayPeriodStart);
      setPayPeriodEnd(newPayPeriodEnd);
    } else {
      // Fallback to default weekly if no settings are loaded
      const defaultCheckDate = addDays(startOfWeek(currentDateForCalculation, { weekStartsOn: 1 }), 4); // Default to Friday
      const defaultPayPeriodEnd = defaultCheckDate;
      const defaultPayPeriodStart = subDays(defaultPayPeriodEnd, 6);
      setCheckDate(defaultCheckDate);
      setPayPeriodStart(defaultPayPeriodStart);
      setPayPeriodEnd(defaultPayPeriodEnd);
    }
  }, [payCycleSettings, currentDateForCalculation]);

  useEffect(() => {
    const handlePayslipDesignUpdate = () => {
      const savedSettings = localStorage.getItem("payslipDesignSettings");
      setPayslipDesignSettings(savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings);
    };

    window.addEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
    return () => {
      window.removeEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
    };
  }, []);

  const handlePreviousPeriod = () => {
    if (!payCycleSettings) return;

    let newCurrentDate = currentDateForCalculation;
    if (payCycleSettings.payCycleType === "Monthly") {
      newCurrentDate = subMonths(newCurrentDate, 1);
    } else if (payCycleSettings.payCycleType === "Weekly") {
      newCurrentDate = subWeeks(newCurrentDate, 1);
    } else if (payCycleSettings.payCycleType === "Bi-Weekly") {
      newCurrentDate = subWeeks(newCurrentDate, 2);
    }
    setCurrentDateForCalculation(newCurrentDate);
  };

  const handleNextPeriod = () => {
    if (!payCycleSettings) return;

    let newCurrentDate = currentDateForCalculation;
    if (payCycleSettings.payCycleType === "Monthly") {
      newCurrentDate = addMonths(newCurrentDate, 1);
    } else if (payCycleSettings.payCycleType === "Weekly") {
      newCurrentDate = addWeeks(newCurrentDate, 1);
    } else if (payCycleSettings.payCycleType === "Bi-Weekly") {
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

  const payCycleLabel = payCycleSettings?.payCycleType || "Weekly";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Payroll</CardTitle>
        <CardDescription>
          Manage your upcoming payroll cycle and perform quick actions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">{payCycleLabel}</h3>
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                {dueText}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePreviousPeriod} disabled={isLoadingPayCycleSettings}>
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
              <Button variant="ghost" size="icon" onClick={handleNextPeriod} disabled={isLoadingPayCycleSettings}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleRunPayroll} className="w-full" disabled={isLoadingPayCycleSettings}>
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

export default UpcomingPayrollCard;