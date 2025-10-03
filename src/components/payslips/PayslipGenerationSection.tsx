"use client";

import React from "react";
import ReactDOM from 'react-dom/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import IndividualPayslipCard from "./IndividualPayslipCard";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces"; // Import MockCompanyDetails
import { getPrintClasses } from "@/lib/utils";

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
  companyDetails: MockCompanyDetails; // New prop for all company details
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
  companyDetails, // Destructure new prop
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

  const generatePayslipElementForPdf = (payslip: MockPayslip): Promise<HTMLIFrameElement> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px'; // Position off-screen
      iframe.style.top = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden'; // Ensure it's hidden
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        reject(new Error("Could not access iframe document."));
        return;
      }

      iframeDoc.open();
      iframeDoc.write('<!DOCTYPE html><html><head><title>Payslip</title></head><body><div id="payslip-root"></div></body></html>');
      iframeDoc.close();

      // Copy all stylesheets and style tags from the main document to the iframe
      Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(node => {
        const clonedNode = node.cloneNode(true);
        iframeDoc.head.appendChild(clonedNode);
      });

      // No need for baseStyle.innerHTML to convert Tailwind classes to inline CSS.
      // html2canvas should pick up the Tailwind classes from the copied stylesheets.

      const payslipRoot = iframeDoc.getElementById('payslip-root');
      if (!payslipRoot) {
        reject(new Error("Payslip root element not found in iframe."));
        return;
      }

      const root = ReactDOM.createRoot(payslipRoot);
      root.render(
        <IndividualPayslipCard
          payslip={payslip}
          payslipDesignSettings={payslipDesignSettings}
          companyDetails={companyDetails} // Pass all company details
          employees={allEmployees}
          getEmployeeName={getEmployeeName}
          isPdfGeneration={true}
        />
      );

      // Store the root for cleanup
      (iframe as any)._reactRoot = root;

      // Wait for images and other resources to load within the iframe
      iframe.onload = () => {
        console.log("Iframe content loaded.");
        resolve(iframe);
      };
      // Fallback if onload doesn't fire or for immediate content
      setTimeout(() => {
        console.log("Iframe content ready after timeout.");
        resolve(iframe);
      }, 1500); // Increased delay for iframe content to settle
    });
  };

  const cleanupPayslipElementForPdf = (iframe: HTMLIFrameElement) => {
    const root = (iframe as any)._reactRoot;
    if (root) {
      root.unmount();
    }
    document.body.removeChild(iframe);
  };

  const handlePrintOrDownload = async (action: 'print' | 'download') => {
    if (!selectedPayslip) {
      showError(`Please select a payslip to ${action}.`);
      return;
    }

    showSuccess(`Generating PDF for ${action}, please wait...`);

    let iframe: HTMLIFrameElement | null = null;
    try {
      iframe = await generatePayslipElementForPdf(selectedPayslip);
      const payslipElement = iframe.contentWindow?.document.getElementById('payslip-root');

      if (!payslipElement) {
        throw new Error("Payslip root element not found in iframe for capture.");
      }

      console.log(`Payslip element innerHTML before PDF generation (${action}):`, payslipElement.innerHTML);

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
      if (iframe) {
        cleanupPayslipElementForPdf(iframe);
      }
    }
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
              <DropdownMenuItem onClick={() => handlePrintOrDownload('print')} disabled={!selectedPayslipId}>
                <Printer className="mr-2 h-4 w-4" /> Print Payslip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintOrDownload('download')} disabled={!selectedPayslipId}>
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