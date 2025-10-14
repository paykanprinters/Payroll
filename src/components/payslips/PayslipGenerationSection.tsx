"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { format, isSameMonth, isSameYear, isSameWeek, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import IndividualPayslipCard from "./IndividualPayslipCard";
import EmployeePayslipSelector from "./EmployeePayslipSelector";
import IndividualPayslipActions from "./IndividualPayslipActions";
import BulkPayslipActions from "./BulkPayslipActions";
import BulkPayslipsRenderer from "./BulkPayslipsRenderer"; // Import the new component
import { showError, showSuccess } from "@/utils/toast"; // Ensure showError and showSuccess are imported
import { Button } from "@/components/ui/button"; // Import Button
import { FileStack, CalendarCheck } from "lucide-react"; // Import FileStack and CalendarCheck icons

interface PayslipGenerationSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  getEmployeeName: (employeeId: string) => string;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails | null; // Receive companyDetails as prop
  allEmployees: MockEmployee[];
}

const PayslipGenerationSection: React.FC<PayslipGenerationSectionProps> = ({
  employees,
  payslips,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedPayslipId,
  setSelectedPayslipId,
  getEmployeeName,
  payslipDesignSettings,
  companyDetails, // Destructure companyDetails
  allEmployees,
}) => {
  const [selectedPayPeriodDate, setSelectedPayPeriodDate] = React.useState<Date | undefined>(new Date());
  const [bulkGenerationMode, setBulkGenerationMode] = React.useState<"monthly" | "weekly">("monthly"); // New state for bulk mode
  const { generatePdf, printPdf } = usePdfGenerator();

  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);

  React.useEffect(() => {
    if (selectedEmployeeId && filteredPayslipsForEmployee.length > 0) {
      const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecentPayslip && mostRecentPayslip.id !== selectedPayslipId) {
        setSelectedPayslipId(mostRecentPayslip.id);
      }
    } else if (!selectedEmployeeId && selectedPayslipId) {
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, filteredPayslipsForEmployee, selectedPayslipId, setSelectedPayslipId]);

  const handlePrintOrDownloadIndividual = useCallback(async (action: 'print' | 'download') => {
    if (!selectedPayslip || !companyDetails) { // Check companyDetails
      showError(`Please select a payslip and ensure company details are loaded to ${action}.`);
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <IndividualPayslipCard
        payslip={selectedPayslip}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={allEmployees}
        getEmployeeName={getEmployeeName}
        isPdfGeneration={true}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
      format: payslipDesignSettings.layoutSize?.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'payslip' as const, // Specify document type
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [selectedPayslip, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, generatePdf, printPdf]);

  const handlePrintOrDownloadAll = useCallback(async (action: 'print' | 'download', mode: "monthly" | "weekly") => {
    if (!selectedPayPeriodDate || !companyDetails) { // Check companyDetails
      showError("Please select a pay period date and ensure company details are loaded to generate all payslips.");
      return;
    }

    const payslipsForPeriod = payslips.filter(p => {
      const employee = allEmployees.find(emp => emp.id === p.employeeId);
      if (!employee) return false;

      const [startPeriodStr] = p.payPeriod.split(' - ');
      const payslipDate = new Date(startPeriodStr);

      if (mode === "monthly" && employee.payFrequency === "Monthly") {
        return isSameMonth(payslipDate, selectedPayPeriodDate) && isSameYear(payslipDate, selectedPayPeriodDate);
      } else if (mode === "weekly" && (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly")) {
        // Assuming week starts on Monday (1) for isSameWeek
        return isSameWeek(payslipDate, selectedPayPeriodDate, { weekStartsOn: 1 }) && isSameYear(payslipDate, selectedPayPeriodDate);
      }
      return false;
    });

    if (payslipsForPeriod.length === 0) {
      showError(`No ${mode} payslips found for the selected period (${format(selectedPayPeriodDate, mode === "monthly" ? 'MMM yyyy' : 'PPP')}).`);
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <BulkPayslipsRenderer
        payslips={payslipsForPeriod}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={allEmployees}
        getEmployeeName={getEmployeeName}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `all-${mode}-payslips-${format(selectedPayPeriodDate, mode === "monthly" ? 'yyyy-MM' : 'yyyy-MM-dd')}.pdf`,
      format: payslipDesignSettings.layoutSize?.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'payslip' as const, // Specify document type
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [selectedPayPeriodDate, payslips, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, generatePdf, printPdf]);

  const handleGenerateAllCurrentPeriodPayslips = useCallback(async (action: 'print' | 'download') => {
    if (!companyDetails) { // Check companyDetails
      showError("Company details are not loaded. Cannot generate all payslips for current period.");
      return;
    }

    const today = new Date();
    const payslipsForCurrentPeriod: MockPayslip[] = [];

    allEmployees.forEach(employee => {
      let periodStart: Date;
      let periodEnd: Date;
      let periodFormat: string;

      if (employee.payFrequency === "Monthly") {
        periodStart = startOfMonth(today);
        periodEnd = endOfMonth(today);
        periodFormat = "yyyy-MM-dd";
      } else if (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly") {
        periodStart = startOfWeek(today, { weekStartsOn: 1 }); // Assuming week starts on Monday
        periodEnd = endOfWeek(today, { weekStartsOn: 1 });
        periodFormat = "yyyy-MM-dd";
      } else {
        console.warn(`Employee ${employee.id} has unsupported pay frequency: ${employee.payFrequency}. Skipping.`);
        return;
      }

      const targetPayPeriodString = `${format(periodStart, periodFormat)} - ${format(periodEnd, periodFormat)}`;

      const foundPayslip = payslips.find(p =>
        p.employeeId === employee.id && p.payPeriod === targetPayPeriodString
      );

      if (foundPayslip) {
        payslipsForCurrentPeriod.push(foundPayslip);
      }
    });

    if (payslipsForCurrentPeriod.length === 0) {
      showError("No payslips found for the current period for any employee. Ensure mock data is up-to-date.");
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <BulkPayslipsRenderer
        payslips={payslipsForCurrentPeriod}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={allEmployees}
        getEmployeeName={getEmployeeName}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `all-payslips-current-period-${format(today, 'yyyy-MM-dd')}.pdf`,
      format: payslipDesignSettings.layoutSize?.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'payslip' as const,
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
      showSuccess(`All payslips for the current period downloaded successfully!`);
    } else {
      await printPdf(renderComponent, options);
      showSuccess(`All payslips for the current period sent to printer!`);
    }

  }, [allEmployees, payslips, payslipDesignSettings, companyDetails, getEmployeeName, generatePdf, printPdf]);

  const handleSelectCurrentPeriodPayslip = useCallback(() => {
    if (!selectedEmployeeId) {
      showError("Please select an employee first.");
      return;
    }

    const employee = allEmployees.find(emp => emp.id === selectedEmployeeId);
    if (!employee) {
      showError("Selected employee not found.");
      return;
    }

    const today = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let periodFormat: string;

    if (employee.payFrequency === "Monthly") {
      periodStart = startOfMonth(today);
      periodEnd = endOfMonth(today);
      periodFormat = "yyyy-MM-dd";
    } else if (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly") {
      periodStart = startOfWeek(today, { weekStartsOn: 1 }); // Assuming week starts on Monday
      periodEnd = endOfWeek(today, { weekStartsOn: 1 });
      periodFormat = "yyyy-MM-dd";
    } else {
      showError(`Employee ${employee.firstName} ${employee.lastName} has an unsupported pay frequency: ${employee.payFrequency}.`);
      return;
    }

    const targetPayPeriodString = `${format(periodStart, periodFormat)} - ${format(periodEnd, periodFormat)}`;

    const foundPayslip = payslips.find(p =>
      p.employeeId === selectedEmployeeId && p.payPeriod === targetPayPeriodString
    );

    if (foundPayslip) {
      setSelectedPayslipId(foundPayslip.id);
      showSuccess(`Payslip for ${employee.firstName} ${employee.lastName} for the current period (${foundPayslip.payPeriod}) selected.`);
    } else {
      showError(`No payslip found for ${employee.firstName} ${employee.lastName} for the current period (${targetPayPeriodString}).`);
    }
  }, [selectedEmployeeId, allEmployees, payslips, setSelectedPayslipId]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Payslips</CardTitle>
        <CardDescription>
          Generate individual payslips or a batch of all payslips for printing or downloading.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
          <EmployeePayslipSelector
            employees={employees}
            payslips={payslips}
            selectedEmployeeId={selectedEmployeeId}
            setSelectedEmployeeId={setSelectedEmployeeId}
            selectedPayslipId={selectedPayslipId}
            setSelectedPayslipId={setSelectedPayslipId}
            filteredPayslipsForEmployee={filteredPayslipsForEmployee}
          />
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleSelectCurrentPeriodPayslip}
              disabled={!selectedEmployeeId}
            >
              <CalendarCheck className="mr-2 h-4 w-4" /> Select Current Period Payslip
            </Button>
            <IndividualPayslipActions
              selectedPayslip={selectedPayslip}
              onPrint={() => handlePrintOrDownloadIndividual('print')}
              onDownload={() => handlePrintOrDownloadIndividual('download')}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end"> {/* Adjusted grid for bulk actions */}
          <BulkPayslipActions
            payslips={payslips}
            selectedPayPeriodDate={selectedPayPeriodDate}
            setSelectedPayPeriodDate={setSelectedPayPeriodDate}
            bulkGenerationMode={bulkGenerationMode}
            setBulkGenerationMode={setBulkGenerationMode}
            onPrintAll={handlePrintOrDownloadAll}
            onDownloadAll={handlePrintOrDownloadAll}
          />
          <div className="md:col-span-2 lg:col-span-1 flex items-end"> {/* Adjusted span for button alignment */}
            <Button
              className="w-full"
              onClick={() => handleGenerateAllCurrentPeriodPayslips('download')}
              disabled={allEmployees.length === 0 || payslips.length === 0}
            >
              <FileStack className="mr-2 h-4 w-4" /> Generate All for Current Period
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayslipGenerationSection;