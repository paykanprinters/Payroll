"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import html2pdf from 'html2pdf.js';

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
}

interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
}

interface PayslipGenerationSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  getEmployeeName: (employeeId: string) => string;
}

const PayslipGenerationSection: React.FC<PayslipGenerationSectionProps> = ({
  employees,
  payslips,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedPayslipId,
  setSelectedPayslipId,
  getEmployeeName,
}) => {
  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);

  const handlePrintPayslip = () => {
    if (!selectedPayslipId) {
      showError("Please select a payslip to print.");
      return;
    }
    const payslipElement = document.getElementById(`payslip-${selectedPayslipId}`);
    if (payslipElement) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Payslip</title>');
        printWindow.document.write('<link rel="stylesheet" href="/src/globals.css">');
        printWindow.document.write('<style>');
        printWindow.document.write('@media print { body { margin: 0; } .no-print { display: none; } }');
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(payslipElement.outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        showSuccess("Payslip sent to printer.");
      } else {
        showError("Could not open print window.");
      }
    } else {
      showError("Selected payslip not found for printing.");
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedPayslipId) {
      showError("Please select a payslip to download.");
      return;
    }
    const payslipElement = document.getElementById(`payslip-${selectedPayslipId}`);
    if (payslipElement) {
      showSuccess("Generating PDF, please wait...");
      html2pdf().from(payslipElement).set({
        margin: [10, 10, 10, 10],
        filename: `payslip-${selectedEmployeeId}-${selectedPayslipId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
    } else {
      showError("Selected payslip not found for PDF download.");
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