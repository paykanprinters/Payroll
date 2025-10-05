"use client";

import React from "react";
import ReactDOM from 'react-dom/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download, CalendarIcon } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import IndividualPayslipCard from "./IndividualPayslipCard";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { format, isSameMonth, isSameYear } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PayslipDesignSettings {
  showCompanyLogo?: boolean;
  showCompanyDetails?: boolean;
  showEmployeeDetails?: boolean;
  showEarningsBreakdown?: boolean;
  showDeductionsBreakdown?: boolean;
  showLeaveSummary?: boolean;
  showBankDetails?: boolean;
  showYTD?: boolean;
  sectionOrder?: ("Earnings" | "Deductions")[];
  layoutSize?: "Letter" | "A4" | "A5";
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right";
}

interface PayslipGenerationSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  getEmployeeName: (employeeId: string) => string;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails;
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
  companyDetails,
  allEmployees,
}) => {
  const [selectedPayPeriodDate, setSelectedPayPeriodDate] = React.useState<Date | undefined>(new Date());

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

  // Helper to render an IndividualPayslipCard into a hidden DOM element for PDF generation
  const renderPayslipToDomElement = (payslip: MockPayslip, container: HTMLDivElement): Promise<void> => {
    return new Promise((resolve) => {
      const payslipRoot = document.createElement('div');
      container.appendChild(payslipRoot);

      const root = ReactDOM.createRoot(payslipRoot);
      root.render(
        <IndividualPayslipCard
          payslip={payslip}
          payslipDesignSettings={payslipDesignSettings}
          companyDetails={companyDetails}
          employees={allEmployees}
          getEmployeeName={getEmployeeName}
          isPdfGeneration={true}
          onReadyForPdf={() => {
            console.log(`Payslip ${payslip.id} signaled readiness.`);
            resolve();
          }}
        />
      );

      // Store the root for cleanup
      (payslipRoot as any)._reactRoot = root;

      // Fallback if onReadyForPdf doesn't fire (e.g., no images, or component renders very fast)
      setTimeout(() => {
        if (!payslipRoot.isConnected) return; // Already resolved and cleaned up
        console.warn(`Payslip ${payslip.id} rendering timed out, proceeding.`);
        resolve();
      }, 5000); // Increased timeout
    });
  };

  // Helper to clean up the temporary DOM element and its React root
  const cleanupRenderedElement = (container: HTMLDivElement) => {
    Array.from(container.children).forEach(child => {
      const root = (child as any)._reactRoot;
      if (root) {
        root.unmount();
      }
    });
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  const handlePrintOrDownload = async (action: 'print' | 'download') => {
    if (!selectedPayslip) {
      showError(`Please select a payslip to ${action}.`);
      return;
    }

    const toastId = showLoading(`Generating PDF for ${action}, please wait...`) as string;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    try {
      await renderPayslipToDomElement(selectedPayslip, container);
      const payslipElement = container.firstChild as HTMLDivElement; // Get the rendered payslip

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(payslipElement).set(opt);

      if (action === 'download') {
        await pdfPromise.save();
        showSuccess("Payslip PDF downloaded successfully!");
      } else { // 'print'
        const pdf = await pdfPromise.toPdf().get('pdf');
        pdf.output('dataurlnewwindow');
        showSuccess("Payslip sent to printer.");
      }
    } catch (error: any) {
      showError(`Error generating PDF for ${action}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf ${action} error:`, error);
    } finally {
      dismissToast(toastId);
      cleanupRenderedElement(container);
    }
  };

  const handlePrintOrDownloadAll = async (action: 'print' | 'download') => {
    if (!selectedPayPeriodDate) {
      showError("Please select a pay period date to generate all payslips.");
      return;
    }

    const payslipsForPeriod = payslips.filter(p => {
      const [startPeriodStr, endPeriodStr] = p.payPeriod.split(' - ');
      const payslipDate = new Date(startPeriodStr); // Use start date of pay period for comparison
      return isSameMonth(payslipDate, selectedPayPeriodDate) && isSameYear(payslipDate, selectedPayPeriodDate);
    });

    if (payslipsForPeriod.length === 0) {
      showError(`No payslips found for the selected pay period (${format(selectedPayPeriodDate, 'MMM yyyy')}).`);
      return;
    }

    const toastId = showLoading(`Generating all payslips for ${format(selectedPayPeriodDate, 'MMM yyyy')} for ${action}, please wait...`) as string;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    try {
      // Render all payslips into the single container with page breaks
      for (let i = 0; i < payslipsForPeriod.length; i++) {
        await renderPayslipToDomElement(payslipsForPeriod[i], container);
        if (i < payslipsForPeriod.length - 1) {
          const pageBreak = document.createElement('div');
          pageBreak.style.pageBreakAfter = 'always';
          container.appendChild(pageBreak);
        }
      }

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `all-payslips-${format(selectedPayPeriodDate, 'yyyy-MM')}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(container).set(opt);

      if (action === 'download') {
        await pdfPromise.save();
        showSuccess("All payslips PDF downloaded successfully!");
      } else { // 'print'
        const pdf = await pdfPromise.toPdf().get('pdf');
        pdf.output('dataurlnewwindow');
        showSuccess("All payslips sent to printer.");
      }
    } catch (error: any) {
      showError(`Error generating all payslips for ${action}: ${error.message || 'Unknown error'}`);
      console.error(`html2pdf all payslips ${action} error:`, error);
    } finally {
      dismissToast(toastId);
      cleanupRenderedElement(container);
    }
  };

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
          <div className="lg:col-span-2">
            <label htmlFor="employee-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Select Employee
            </label>
            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
              <SelectTrigger id="employee-select" className="mt-1">
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

          <div>
            <label htmlFor="payslip-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Select Payslip
            </label>
            <Select onValueChange={setSelectedPayslipId} value={selectedPayslipId} disabled={!selectedEmployeeId || filteredPayslipsForEmployee.length === 0}>
              <SelectTrigger id="payslip-select" className="mt-1">
                <SelectValue placeholder="Select a payslip" />
              </SelectTrigger>
              <SelectContent>
                {filteredPayslipsForEmployee.length > 0 ? (
                  filteredPayslipsForEmployee.map((payslip) => (
                    <SelectItem key={payslip.id} value={payslip.id}>
                      {payslip.payPeriod}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-payslips" disabled>
                    No payslips for this employee
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" disabled={!selectedPayslipId}>
                Generate Payslip
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlePrintOrDownload('print')} disabled={!selectedPayslipId}>
                <Printer className="mr-2 h-4 w-4" /> Print Payslip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintOrDownload('download')} disabled={!selectedPayslipId}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 items-end">
          <div>
            <label htmlFor="pay-period-select" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Select Pay Period for All Payslips
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !selectedPayPeriodDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedPayPeriodDate ? format(selectedPayPeriodDate, "MMM yyyy") : <span>Pick a month</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedPayPeriodDate}
                  onSelect={setSelectedPayPeriodDate}
                  initialFocus
                  captionLayout="dropdown-buttons" // Allows month/year selection
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" variant="outline" disabled={!selectedPayPeriodDate || payslips.length === 0}>
                Generate All Payslips
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlePrintOrDownloadAll('print')} disabled={!selectedPayPeriodDate || payslips.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Print All Payslips
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintOrDownloadAll('download')} disabled={!selectedPayPeriodDate || payslips.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Download All Payslips PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayslipGenerationSection;