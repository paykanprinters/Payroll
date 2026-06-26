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
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import HoursBreakdown from "@/components/payslips/HoursBreakdown";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import { format } from "date-fns";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import PayslipPdfDocument from "@/components/payslips/PayslipPdfDocument";
import { Printer, Download } from "lucide-react";
import { showError } from "@/utils/toast";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { getTaxTableBlockingMessage } from "@/lib/tax-tables-validation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface CalculatePaycheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payslipDesignSettings: PayslipDesignSettings;
}

const CalculatePaycheckDialog: React.FC<CalculatePaycheckDialogProps> = ({ isOpen, onClose, payslipDesignSettings }) => {
  const {
    employees,
    calculateSinglePayslipPreview,
    companyDetails,
    taxTableValidation,
    isTaxTablesReady,
    userTaxSettings,
    payCycleSettings,
    timesheets,
    workHoursSettings,
  } = usePayrollProcessor();
  const { downloadPdf, openPdf } = usePdfVector();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [previewPayslip, setPreviewPayslip] = useState<MockPayslip | null>(null);
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);
  const [taxTablesBlockMessage, setTaxTablesBlockMessage] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeId("");
      setPreviewPayslip(null);
      setTaxTablesBlockMessage(null);
      // Determine current period based on configured pay cycle for preview
      const today = new Date();
      const settings = payCycleSettings ? {
        payCycleType: payCycleSettings.payCycleType,
        cutOffDay: payCycleSettings.cutOffDay,
        payDayOffset: payCycleSettings.payDayOffset,
      } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };
      const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
        today,
        settings.payCycleType as "Monthly" | "Weekly" | "Bi-Weekly",
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
    if (employee) {
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
      settings.payCycleType as "Monthly" | "Weekly" | "Bi-Weekly",
      settings.cutOffDay,
      settings.payDayOffset
    );
    periodStart = payPeriodStart;
    periodEnd = payPeriodEnd;

    setCurrentPeriodStart(periodStart);
    setCurrentPeriodEnd(periodEnd);

      const payeApplies = userTaxSettings?.applyPaye ?? false;
      if (payeApplies && !isTaxTablesReady) {
        setTaxTablesBlockMessage(
          (taxTableValidation && getTaxTableBlockingMessage(taxTableValidation)) ??
            "PAYE tax tables are not ready. Apply or refresh them in Settings → Tax Liabilities."
        );
        return;
      }

      setTaxTablesBlockMessage(null);
      const calculatedPayslip = calculateSinglePayslipPreview(employeeId, periodStart, periodEnd);
      setPreviewPayslip(calculatedPayslip);
    }
  }, [employees, calculateSinglePayslipPreview, taxTableValidation, isTaxTablesReady, userTaxSettings, payCycleSettings]);

  const handlePrintOrDownload = useCallback(async (action: 'print' | 'download') => {
    if (!previewPayslip || !currentPeriodStart || !currentPeriodEnd) {
      showError("No payslip preview available to print or download.");
      return;
    }

    const doc = (
      <PayslipPdfDocument
        payslips={[previewPayslip]}
        employees={employees}
        companyDetails={companyDetails}
        payslipDesignSettings={payslipDesignSettings}
        getEmployeeName={(id) => employees.find(emp => emp.id === id)?.firstName + " " + employees.find(emp => emp.id === id)?.lastName || "Unknown"}
      />
    );

    const filename = `payslip-preview-${previewPayslip.employeeId}-${format(currentPeriodStart, 'yyyy-MM-dd')}.pdf`;

    if (action === 'download') {
      await downloadPdf(doc, filename);
    } else {
      await openPdf(doc, filename);
    }
  }, [previewPayslip, companyDetails, currentPeriodStart, currentPeriodEnd, payslipDesignSettings, employees, downloadPdf, openPdf]);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[900px] lg:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview paycheck</DialogTitle>
          <DialogDescription>
            Select an employee to preview their payslip calculation for the current pay period.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-grow overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="employee-select">Employee</Label>
            <Select onValueChange={handleEmployeeSelect} value={selectedEmployeeId}>
              <SelectTrigger id="employee-select">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}{emp.customEmployeeId ? ` • ${emp.customEmployeeId}` : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-employees" disabled>
                    No employees available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeId && taxTablesBlockMessage && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-900">
              <AlertTitle>Tax tables not ready</AlertTitle>
              <AlertDescription>
                {taxTablesBlockMessage} Print/Download are disabled until tables are ready.
              </AlertDescription>
            </Alert>
          )}

          {previewPayslip && currentPeriodStart && currentPeriodEnd ? (
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
                  <Printer className="mr-2 h-4 w-4" /> Print preview
                </Button>
                <Button onClick={() => handlePrintOrDownload('download')} disabled={!previewPayslip}>
                  <Download className="mr-2 h-4 w-4" /> Download preview PDF
                </Button>
              </div>
            </div>
          ) : (
            selectedEmployeeId && !taxTablesBlockMessage && (
              <p className="text-center text-muted-foreground mt-8">Select an employee to see a preview.</p>
            )
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