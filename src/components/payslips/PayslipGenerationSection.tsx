"use client";

import React from "react";
import ReactDOM from 'react-dom/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import IndividualPayslipCard from "./IndividualPayslipCard";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { format } from "date-fns";

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
  const renderPayslipToDomElement = (payslip: MockPayslip): Promise<{ element: HTMLDivElement; root: ReactDOM.Root }> => {
    return new Promise((resolve) => {
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '0';
      container.style.height = '0';
      container.style.overflow = 'hidden'; // Hide overflow
      document.body.appendChild(container);

      const root = ReactDOM.createRoot(container);
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
            resolve({ element: container, root });
          }}
        />
      );

      // Fallback if onReadyForPdf doesn't fire (e.g., no images, or component renders very fast)
      setTimeout(() => {
        if (!container.isConnected) return; // Already resolved and cleaned up
        console.warn(`Payslip ${payslip.id} rendering timed out, proceeding.`);
        resolve({ element: container, root });
      }, 5000); // Increased timeout
    });
  };

  // Helper to clean up the temporary DOM element and its React root
  const cleanupRenderedElement = (item: { element: HTMLDivElement; root: ReactDOM.Root }) => {
    item.root.unmount();
    if (item.element.parentNode) {
      item.element.parentNode.removeChild(item.element);
    }
  };

  const handlePrintOrDownload = async (action: 'print' | 'download') => {
    if (!selectedPayslip) {
      showError(`Please select a payslip to ${action}.`);
      return;
    }

    const toastId = showLoading(`Generating PDF for ${action}, please wait...`) as string;
    let renderedPayslip: { element: HTMLDivElement; root: ReactDOM.Root } | null = null;

    try {
      renderedPayslip = await renderPayslipToDomElement(selectedPayslip);
      const payslipElement = renderedPayslip.element;

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
      if (renderedPayslip) {
        cleanupRenderedElement(renderedPayslip);
      }
    }
  };

  const handlePrintOrDownloadAll = async (action: 'print' | 'download') => {
    if (payslips.length === 0) {
      showError(`No payslips available to ${action}.`);
      return;
    }

    const toastId = showLoading(`Generating all payslips for ${action}, please wait...`) as string;
    let renderedPayslips: { element: HTMLDivElement; root: ReactDOM.Root }[] = [];

    try {
      // Render all payslips to hidden DOM elements
      const renderPromises = payslips.map(p => renderPayslipToDomElement(p));
      renderedPayslips = await Promise.all(renderPromises);

      const payslipElements = renderedPayslips.map(item => item.element);

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `all-payslips-${format(new Date(), 'yyyyMMddHHmmss')}.pdf`,
        image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'screen', useCORS: true },
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' as 'portrait' }
      };

      const pdfPromise = html2pdf().from(payslipElements).set(opt);

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
      // Clean up all temporary DOM elements
      renderedPayslips.forEach(cleanupRenderedElement);
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
        <div className="mt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full" variant="outline" disabled={payslips.length === 0}>
                Generate All Payslips
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlePrintOrDownloadAll('print')} disabled={payslips.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Print All Payslips
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintOrDownloadAll('download')} disabled={payslips.length === 0}>
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