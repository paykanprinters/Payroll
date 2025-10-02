"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import IndividualPayslipCard from "./IndividualPayslipCard"; // Import IndividualPayslipCard
import { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces"; // Import MockEmployee

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

  const generatePayslipHtml = (payslip: MockPayslip) => {
    // Create a temporary div to render the IndividualPayslipCard into
    const tempDiv = document.createElement('div');
    // Render the IndividualPayslipCard into the temporary div
    // We need to use ReactDOM.render or similar for a full React component,
    // but for simple HTML generation, we can manually construct it or use a library.
    // Given the complexity, it's better to let html2pdf process the already rendered component in the DOM.
    // However, for a standalone generation, we need to simulate the rendering.
    // For this mock, we'll rely on the component being present in the DOM for the preview.
    // If we were to generate it completely independently, we'd need a more complex setup.
    // For now, we'll grab the already rendered preview.

    const payslipElement = document.getElementById(`payslip-${payslip.id}`);
    if (payslipElement) {
      return payslipElement.outerHTML;
    }
    return "<p>Error: Payslip content not found.</p>";
  };

  const handlePrintPayslip = () => {
    if (!selectedPayslip) {
      showError("Please select a payslip to print.");
      return;
    }

    showSuccess("Preparing payslip for printing...");

    const payslipHtmlContent = generatePayslipHtml(selectedPayslip);
    if (payslipHtmlContent === "<p>Error: Payslip content not found.</p>") {
      showError("Selected payslip content not found for printing.");
      return;
    }

    let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
    if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
    else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
      jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = payslipHtmlContent;
    element.style.fontSize = `${payslipDesignSettings.reportContentFontSize || 14}px`; // Apply font size if available

    html2pdf().from(element).set(opt).toPdf().get('pdf').then(function (pdf) {
      pdf.autoPrint();
      window.open(pdf.output('bloburl'), '_blank');
    });
  };

  const handleDownloadPdf = () => {
    if (!selectedPayslip) {
      showError("Please select a payslip to download.");
      return;
    }

    showSuccess("Generating PDF, please wait...");

    const payslipHtmlContent = generatePayslipHtml(selectedPayslip);
    if (payslipHtmlContent === "<p>Error: Payslip content not found.</p>") {
      showError("Selected payslip content not found for PDF download.");
      return;
    }

    let pdfFormat: 'a4' | 'letter' | 'a5' = 'a4';
    if (payslipDesignSettings.layoutSize === 'Letter') pdfFormat = 'letter';
    else if (payslipDesignSettings.layoutSize === 'A5') pdfFormat = 'a5';

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
      jsPDF: { unit: 'mm', format: pdfFormat, orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = payslipHtmlContent;
    element.style.fontSize = `${payslipDesignSettings.reportContentFontSize || 14}px`; // Apply font size if available

    html2pdf().from(element).set(opt).save();
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