"use client";

import React from "react";
import ReactDOM from 'react-dom/client'; // Import ReactDOM for client-side rendering
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import IndividualPayslipCard from "./IndividualPayslipCard"; // Import IndividualPayslipCard
import { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces"; // Import MockEmployee
import { getPrintClasses } from "@/lib/utils"; // Import getPrintClasses

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
  payslipDesignSettings: PayslipDesignSettings; // New prop
  companyTradingName: string; // New prop
  companyLogoUrl: string | null; // New prop
  companyLogoSize: number; // New prop
  allEmployees: MockEmployee[]; // New prop to pass to IndividualPayslipCard
}

const PayslipGenerationSection: React.FC<PayslipGenerationSectionProps> = ({
  employees,
  payslips,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedPayslipId,
  setSelectedPayslipId,
  getEmployeeName,
  payslipDesignSettings, // Destructure new prop
  companyTradingName, // Destructure new prop
  companyLogoUrl, // Destructure new prop
  companyLogoSize, // Destructure new prop
  allEmployees, // Destructure new prop
}) => {
  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);

  // Effect to automatically select the most recent payslip when an employee is selected
  React.useEffect(() => {
    if (selectedEmployeeId && filteredPayslipsForEmployee.length > 0) {
      // Sort payslips by pay period (assuming 'payPeriod' is sortable string like 'YYYY-MM-DD - YYYY-MM-DD')
      const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecentPayslip && mostRecentPayslip.id !== selectedPayslipId) {
        setSelectedPayslipId(mostRecentPayslip.id);
      }
    } else if (!selectedEmployeeId && selectedPayslipId) {
      // Clear selected payslip if no employee is selected
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, filteredPayslipsForEmployee, selectedPayslipId, setSelectedPayslipId]);

  const generatePayslipElementForPdf = (payslip: MockPayslip): HTMLElement | null => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden'; // Use visibility hidden
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.zIndex = '-1'; // Ensure it's behind everything
    document.body.appendChild(tempContainer);

    const root = ReactDOM.createRoot(tempContainer);
    root.render(
      <IndividualPayslipCard
        payslip={payslip}
        payslipDesignSettings={payslipDesignSettings}
        companyTradingName={companyTradingName}
        companyLogoUrl={companyLogoUrl}
        companyLogoSize={companyLogoSize}
        employees={allEmployees}
        getEmployeeName={getEmployeeName}
        isPdfGeneration={true} // Indicate that this is for PDF generation
      />
    );

    // Store the root for cleanup
    (tempContainer as any)._reactRoot = root;

    return tempContainer;
  };

  const cleanupPayslipElementForPdf = (element: HTMLElement) => {
    const root = (element as any)._reactRoot;
    if (root) {
      root.unmount();
    }
    document.body.removeChild(element);
  };

  const handlePrintPayslip = () => {
    if (!selectedPayslip) {
      showError("Please select a payslip to print.");
      return;
    }

    showSuccess("Preparing payslip for printing...");

    const payslipElement = generatePayslipElementForPdf(selectedPayslip);
    if (!payslipElement) {
      showError("Failed to generate payslip content for printing.");
      return;
    }

    // Introduce a small delay to ensure React has fully rendered the component
    setTimeout(() => {
      console.log("Payslip element innerHTML before PDF generation (Print):", payslipElement.innerHTML); // Debug log

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'print', debug: true, useCORS: true }, // Added debug and useCORS
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' }
      };

      html2pdf().from(payslipElement).set(opt).toPdf().get('pdf').then(function (pdf) {
        pdf.output('dataurlnewwindow'); // Opens in new tab, browser handles print dialog
        cleanupPayslipElementForPdf(payslipElement); // Clean up the temporary element
      }).catch(error => {
        showError("Error generating PDF for printing.");
        console.error("html2pdf error:", error);
        cleanupPayslipElementForPdf(payslipElement);
      });
    }, 500); // Increased delay to 500ms
  };

  const handleDownloadPdf = () => {
    if (!selectedPayslip) {
      showError("Please select a payslip to download.");
      return;
    }

    showSuccess("Generating PDF, please wait...");

    const payslipElement = generatePayslipElementForPdf(selectedPayslip);
    if (!payslipElement) {
      showError("Failed to generate payslip content for PDF download.");
      return;
    }

    // Introduce a small delay to ensure React has fully rendered the component
    setTimeout(() => {
      console.log("Payslip element innerHTML before PDF generation (Download):", payslipElement.innerHTML); // Debug log

      let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
      if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
      else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true, media: 'print', debug: true, useCORS: true }, // Added debug and useCORS
        jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' }
      };

      html2pdf().from(payslipElement).set(opt).save().then(() => {
        cleanupPayslipElementForPdf(payslipElement); // Clean up the temporary element
      }).catch(error => {
        showError("Error generating PDF for download.");
        console.error("html2pdf error:", error);
        cleanupPayslipElementForPdf(payslipElement);
      });
    }, 500); // Increased delay to 500ms
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate a Single Payslip</CardTitle>
        <CardDescription>
          Select an employee and a specific payslip to print or download.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
          <div>
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
              <DropdownMenuItem onClick={handlePrintPayslip} disabled={!selectedPayslipId}>
                <Printer className="mr-2 h-4 w-4" /> Print Payslip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf} disabled={!selectedPayslipId}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayslipGenerationSection;