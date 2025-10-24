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
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations"; // Import the new function

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

const UpcomingPayrollCard: React.FC = () => {
  const navigate = useNavigate();
  const { employees, calculateSinglePayslipPreview, companyDetails, payCycleSettings, isLoadingPayCycleSettings, runPayrollProcess } = usePayrollProcessor(); // Get payCycleSettings and runPayrollProcess

  const [currentDateForCalculation, setCurrentDateForCalculation] = useState<Date>(new Date());
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payPeriodStart, setPayPeriodStart] = useState<Date>(new Date());
  const [payPeriodEnd, setPayPeriodEnd] = useState<Date>(new Date());
  const [isCalculatePaycheckDialogOpen, setIsCalculatePaycheckDialogOpen] = useState(false);
  const [payslipDesignSettings, setPayslipDesignSettings] = useState<PayslipDesignSettings>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings;
  });
  const [totalUpcomingPayrollAmount, setTotalUpcomingPayrollAmount] = useState<number>(0); // New state for total amount

  // Effect to update pay period and check date when settings or current date change
  useEffect(() => {
    if (payCycleSettings) {
      const { checkDate: newCheckDate, payPeriodStart: newPayPeriodStart, payPeriodEnd: newPayPeriodEnd } =
        calculatePayPeriodDetails(
          currentDateForCalculation,
          payCycleSettings.payCycleType,
          payCycleSettings.cutOffDay,
          payCycleSettings.payDayOffset
        );
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

  // NEW: Effect to calculate total upcoming payroll amount
  useEffect(() => {
    const calculateTotalUpcomingPayroll = () => {
      if (!employees.length || !payCycleSettings || !payPeriodStart || !payPeriodEnd) {
        setTotalUpcomingPayrollAmount(0);
        return;
      }

      let totalGross = 0;
      employees.forEach(employee => {
        // Use employee's payFrequency, fallback to company-wide if not set
        const employeePayCycleType = employee.payFrequency || payCycleSettings.payCycleType;
        
        // Calculate employee-specific pay period details using the global pay cycle settings
        const { payPeriodStart: employeeSpecificPeriodStart, payPeriodEnd: employeeSpecificPeriodEnd } = calculatePayPeriodDetails(
          currentDateForCalculation, // Use the base date for calculation
          employeePayCycleType, // Use employee's specific pay cycle type
          payCycleSettings.cutOffDay,
          payCycleSettings.payDayOffset
        );

        const previewPayslip = calculateSinglePayslipPreview(employee.id, employeeSpecificPeriodStart, employeeSpecificPeriodEnd);
        if (previewPayslip) {
          totalGross += previewPayslip.grossEarnings;
        }
      });
      setTotalUpcomingPayrollAmount(totalGross);
    };

    calculateTotalUpcomingPayroll();
  }, [employees, payCycleSettings, calculateSinglePayslipPreview, currentDateForCalculation, payPeriodStart, payPeriodEnd]);


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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Payroll</CardTitle>
        {/* Display the dollar sign icon here */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-4 w-4 text-muted-foreground"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">R {totalUpcomingPayrollAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
        <p className="text-xs text-muted-foreground">
          {dueText}
        </p>
      </CardContent>
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
      <CalculatePaycheckDialog
        isOpen={isCalculatePaycheckDialogOpen}
        onClose={() => setIsCalculatePaycheckDialogOpen(false)}
        payslipDesignSettings={payslipDesignSettings}
      />
    </Card>
  );
};

export default UpcomingPayrollCard;