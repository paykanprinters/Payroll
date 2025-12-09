"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import HoursBreakdown from "@/components/payslips/HoursBreakdown";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import { Printer, Download } from "lucide-react";
import { showError } from "@/utils/toast";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface CalculatePaycheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payslipDesignSettings: PayslipDesignSettings;
}

const CalculatePaycheckDialog: React.FC<CalculatePaycheckDialogProps> = ({ isOpen, onClose, payslipDesignSettings }) => {
  const { employees, calculateSinglePayslipPreview, companyDetails, taxTables, payCycleSettings, timesheets, workHoursSettings } = usePayrollProcessor();
  const { generatePdf, printPdf } = usePdfGenerator();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [previewPayslip, setPreviewPayslip] = useState<MockPayslip | null>(null);
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
  const [isTaxTablesMissing, setIsTaxTablesMissing] = useState<boolean>(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeId("");
      setPreviewPayslip(null);
      setIsTaxTablesMissing(false);
      // Determine current period based on configured pay cycle for preview
      const today = new Date();
      const settings = payCycleSettings ? {
        payCycleType: payCycleSettings.payCycleType,
        cutOffDay: payCycleSettings.cutOffDay,
        payDayOffset: payCycleSettings.payDayOffset,
      } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };
      const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
        today,
        settings.payCycleType,
        settings.cutOffDay,
        settings.payDayOffset
      );
      setCurrentPeriodStart(payPeriodStart);
      setCurrentPeriodEnd(payPeriodEnd);
    }
  }, [isOpen]);

  const handleEmployeeSelect = useCallback((employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setPreviewPayslip(null); // Clear previous preview

    const employee = employees.find(emp => emp.id === employeeId);
    if (employee && companyDetails) {
    let periodStart: Date;
    let periodEnd: Date;

    const today = new Date();
    const settings = payCycleSettings ? {
      payCycleType: payCycleSettings.payCycleType,
      cutOffDay: payCycleSettings.cutOffDay,
      payDayOffset: payCycleSettings.payDayOffset,
    } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };

    const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
      today,
      settings.payCycleType,
      settings.cutOffDay,
      settings.payDayOffset
    );
    periodStart = payPeriodStart;
    periodEnd = payPeriodEnd;

    setCurrentPeriodStart(periodStart);
    setCurrentPeriodEnd(periodEnd);

      // Guard — do not attempt preview calculation if tax tables aren't loaded
      const tablesMissing =
        !taxTables ||
        !taxTables.payeBrackets ||
        taxTables.payeBrackets.length === 0;

      if (tablesMissing) {
        setIsTaxTablesMissing(true);
        // Do not call calculateSinglePayslipPreview here (avoids toast)
        return;
      }

      setIsTaxTablesMissing(false);
      const calculatedPayslip = calculateSinglePayslipPreview(employeeId, periodStart, periodEnd);
      setPreviewPayslip(calculatedPayslip);
    }
  }, [employees, companyDetails, calculateSinglePayslipPreview, taxTables, payCycleSettings]);

  const handlePrintOrDownload = useCallback(async (action: 'print' | 'download') => {
    if (!previewPayslip || !companyDetails || !currentPeriodStart || !currentPeriodEnd) {
      showError("No payslip preview available to print or download.");
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <IndividualPayslipCard
        payslip={previewPayslip}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={employees}
        getEmployeeName={(id) => employees.find(emp => emp.id === id)?.firstName + " " + employees.find(emp => emp.id === id)?.lastName || "Unknown"}
        isPdfGeneration={true}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const filename = `payslip-preview-${previewPayslip.employeeId}-${format(currentPeriodStart, 'yyyy-MM-dd')}.pdf`;
    const options = {
      filename,
      format: payslipDesignSettings.layoutSize?.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'payslip' as const,
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [previewPayslip, companyDetails, currentPeriodStart, currentPeriodEnd, payslipDesignSettings, employees, generatePdf, printPdf]);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[900px] lg:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Calculate Paycheck Preview</DialogTitle>
          <DialogDescription>
            Select an employee to preview their payslip for the current upcoming pay period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-grow overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="employee-select">Select Employee</Label>
            <Select onValueChange={handleEmployeeSelect} value={selectedEmployeeId}>
              <SelectTrigger id="employee-select">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.id})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-employees" disabled>
                    No employees available (enable mock data)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeId && isTaxTablesMissing && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-900">
              <AlertTitle>Tax tables not loaded</AlertTitle>
              <AlertDescription>
                We need PAYE tax tables to generate the payslip preview. Go to Settings → Tax Liabilities to fetch tables,
                then return here. Print/Download are disabled until tables are available.
              </AlertDescription>
            </Alert>
          )}

          {previewPayslip && companyDetails && currentPeriodStart && currentPeriodEnd ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mt-4">
                Payslip Preview for {getEmployeeName(previewPayslip.employeeId)} ({format(currentPeriodStart, 'PPP')} - {format(currentPeriodEnd, 'PPP')})
              </h3>
              <div className="flex justify-center">
                <IndividualPayslipCard
                  payslip={previewPayslip}
                  payslipDesignSettings={payslipDesignSettings}
                  companyDetails={companyDetails}
                  employees={employees}
                  getEmployeeName={getEmployeeName}
                  isPdfGeneration={false}
                />
              </div>

              <HoursBreakdown
                employeeId={previewPayslip.employeeId}
                timesheets={timesheets}
                periodStart={currentPeriodStart}
                periodEnd={currentPeriodEnd}
                workHoursSettings={workHoursSettings || null}
                weeklyThreshold={(workHoursSettings?.overtimeThresholdHours && workHoursSettings.overtimeThresholdHours > 0) ? workHoursSettings.overtimeThresholdHours : 41.25}
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => handlePrintOrDownload('print')} disabled={!previewPayslip}>
                  <Printer className="mr-2 h-4 w-4" /> Print Preview
                </Button>
                <Button onClick={() => handlePrintOrDownload('download')} disabled={!previewPayslip}>
                  <Download className="mr-2 h-4 w-4" /> Download Preview PDF
                </Button>
              </div>
            </div>
          ) : (
            selectedEmployeeId && !isTaxTablesMissing && <p className="text-center text-muted-foreground mt-8">Select an employee to see their paycheck preview.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CalculatePaycheckDialog;