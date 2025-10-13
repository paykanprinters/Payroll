"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { format, addDays, subDays, differenceInCalendarDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor"; // Import the new hook
import { useNavigate } from "react-router-dom"; // Import useNavigate
import CalculatePaycheckDialog from "./CalculatePaycheckDialog"; // Import the new dialog
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces"; // Import PayslipDesignSettings

const defaultPayslipSettings: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true, // Now controlled by a toggle
  showBankDetails: true, // Now controlled by a toggle
  showYTD: true, // New setting for YTD calculations
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
  const { runPayrollProcess } = usePayrollProcessor(); // Use the payroll processor hook

  const [currentCheckDate, setCurrentCheckDate] = useState<Date>(new Date());
  const [payPeriodStart, setPayPeriodStart] = useState<Date>(new Date());
  const [payPeriodEnd, setPayPeriodEnd] = useState<Date>(new Date());
  const [isCalculatePaycheckDialogOpen, setIsCalculatePaycheckDialogOpen] = useState(false);
  const [payslipDesignSettings, setPayslipDesignSettings] = useState<PayslipDesignSettings>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings;
  });

  useEffect(() => {
    // Initialize dates for a weekly payroll cycle (mock data)
    // For simplicity, let's assume payroll runs every Friday, and pay period is previous 2 weeks
    const today = new Date();
    let checkDate = today;

    // Find the next Friday for the check date
    while (checkDate.getDay() !== 5) { // 5 is Friday
      checkDate = addDays(checkDate, 1);
    }
    setCurrentCheckDate(checkDate);

    // Pay period ends on the check date
    const periodEnd = checkDate;
    setPayPeriodEnd(periodEnd);

    // Pay period starts 7 days before the end date for weekly
    const periodStart = subDays(periodEnd, 6);
    setPayPeriodStart(periodStart);

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
    const newCheckDate = subDays(currentCheckDate, 7);
    setCurrentCheckDate(newCheckDate);
    setPayPeriodEnd(newCheckDate);
    setPayPeriodStart(subDays(newCheckDate, 6));
  };

  const handleNextPeriod = () => {
    const newCheckDate = addDays(currentCheckDate, 7);
    setCurrentCheckDate(newCheckDate);
    setPayPeriodEnd(newCheckDate);
    setPayPeriodStart(subDays(newCheckDate, 6));
  };

  const handleRunPayroll = () => {
    runPayrollProcess(payPeriodStart, payPeriodEnd);
    // After running payroll, advance to the next period
    const nextCheckDate = addDays(currentCheckDate, 7);
    setCurrentCheckDate(nextCheckDate);
    setPayPeriodEnd(nextCheckDate);
    setPayPeriodStart(subDays(nextCheckDate, 6));
  };

  const handleNewOffCyclePayroll = () => {
    showSuccess("Starting new off-cycle payroll. Redirecting to Payslips page.");
    navigate("/payslips/overview"); // Navigate to the Payslips overview page
  };

  const handleCalculatePaycheck = () => {
    setIsCalculatePaycheckDialogOpen(true);
  };

  const daysUntilDue = differenceInCalendarDays(currentCheckDate, new Date());
  const dueText = daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : (daysUntilDue === 0 ? "Due Today" : "Overdue");

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
          {/* Payroll Details Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold">Weekly</h3>
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
                  <p className="font-semibold text-lg">{format(currentCheckDate, "MM/dd/yyyy")}</p>
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

          {/* Payroll Actions Section */}
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