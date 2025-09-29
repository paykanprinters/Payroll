"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import html2pdf from 'html2pdf.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
  leaveSummary: { annual: number; sick: number; unpaid: number }; // Added leave summary
}

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Payslips: React.FC = () => {
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslipDesignSettings, setPayslipDesignSettings] = useState<any>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : {};
  });
  const [payrollSummaryData, setPayrollSummaryData] = useState<{ name: string; gross: number; net: number }[]>([]);
  const [deductionsBreakdownData, setDeductionsBreakdownData] = useState<{ name: string; value: number }[]>([]);

  // State for single payslip generation
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");
  const [filteredPayslipsForEmployee, setFilteredPayslipsForEmployee] = useState<MockPayslip[]>([]);

  const loadPayslipsAndEmployees = () => {
    const storedPayslips = localStorage.getItem("mockPayslips");
    if (storedPayslips) {
      const loadedPayslips: MockPayslip[] = JSON.parse(storedPayslips);
      setPayslips(loadedPayslips);

      // Calculate payroll summary for BarChart
      const totalGross = loadedPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
      const totalNet = loadedPayslips.reduce((sum, p) => sum + p.netPay, 0);
      setPayrollSummaryData([
        { name: "Total Payroll", gross: totalGross, net: totalNet },
      ]);

      // Calculate deductions breakdown for PieChart
      const deductionsMap = new Map<string, number>();
      loadedPayslips.forEach(payslip => {
        payslip.deductionsBreakdown.forEach(deduction => {
          deductionsMap.set(deduction.name, (deductionsMap.get(deduction.name) || 0) + deduction.amount);
        });
      });
      setDeductionsBreakdownData(
        Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }))
      );

    } else {
      setPayslips([]);
      setPayrollSummaryData([]);
      setDeductionsBreakdownData([]);
    }

    const storedEmployees = localStorage.getItem("mockEmployees");
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      setEmployees([]);
    }
  };

  const loadPayslipDesignSettings = () => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    setPayslipDesignSettings(savedSettings ? JSON.parse(savedSettings) : {});
  };

  useEffect(() => {
    loadPayslipsAndEmployees();
    loadPayslipDesignSettings();
    window.addEventListener('mockDataUpdated', loadPayslipsAndEmployees);
    window.addEventListener('payslipDesignUpdated', loadPayslipDesignSettings);
    return () => {
      window.removeEventListener('mockDataUpdated', loadPayslipsAndEmployees);
      window.removeEventListener('payslipDesignUpdated', loadPayslipDesignSettings);
    };
  }, []);

  // Effect to filter payslips when employee selection changes
  useEffect(() => {
    if (selectedEmployeeId) {
      const employeePayslips = payslips.filter(p => p.employeeId === selectedEmployeeId);
      setFilteredPayslipsForEmployee(employeePayslips);
      // Reset selected payslip if the current one is not in the new list
      if (!employeePayslips.some(p => p.id === selectedPayslipId)) {
        setSelectedPayslipId("");
      }
    } else {
      setFilteredPayslipsForEmployee([]);
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, payslips]);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const companyTradingName = localStorage.getItem('companyTradingName') || "Your Company Name";
  const companyLogoUrl = localStorage.getItem('companyLogoUrl');
  const companyLogoSize = parseFloat(localStorage.getItem('companyLogoSize') || '40');

  const renderSection = (sectionName: string, payslip: MockPayslip) => {
    const settings = payslipDesignSettings;
    switch (sectionName) {
      case "Earnings":
        return settings.showEarningsBreakdown && (
          <div key="earnings" className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Earnings</h4>
            {payslip.earningsBreakdown.map((item, idx) => (
              <p key={idx} className="text-xs">{item.name}: R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            ))}
            <p className="text-xs font-semibold mt-1">Gross Earnings: R {payslip.grossEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          </div>
        );
      case "Deductions":
        return settings.showDeductionsBreakdown && (
          <div key="deductions" className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Deductions</h4>
            {payslip.deductionsBreakdown.map((item, idx) => (
              <p key={idx} className="text-xs">{item.name}: R {item.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
            ))}
            <p className="text-xs font-semibold mt-1">Total Deductions: R {payslip.totalDeductions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
          </div>
        );
      case "Leave":
        return settings.showLeaveSummary && (
          <div key="leave" className="border-t pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Leave Summary</h4>
            <p className="text-xs">Annual Leave Remaining: {payslip.leaveSummary.annual} days</p>
            <p className="text-xs">Sick Leave Remaining: {payslip.leaveSummary.sick} days</p>
            {payslip.leaveSummary.unpaid > 0 && (
              <p className="text-xs">Unpaid Leave Taken: {payslip.leaveSummary.unpaid} days</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

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
        // Include global styles for printing
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
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payslip Generation & History</h1>
      <p className="text-lg text-muted-foreground">
        Generate new payslips, view historical payslips, and manage payroll periods.
      </p>

      {/* New: Generate Single Payslip Section */}
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

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Gross vs. Net Pay</CardTitle>
            <CardDescription>Comparison of total gross earnings and net pay across all generated payslips.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollSummaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
                <Legend />
                <Bar dataKey="gross" fill="#8884d8" name="Gross Pay" />
                <Bar dataKey="net" fill="#82ca9d" name="Net Pay" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deductions Breakdown</CardTitle>
            <CardDescription>Distribution of total deductions across all payslips.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deductionsBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {deductionsBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payslips.map((payslip) => (
                <div key={payslip.id} id={`payslip-${payslip.id}`} className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <h3 className="text-lg font-bold mb-3 text-center">Payslip</h3>
                  <div className="border p-4 rounded-md space-y-3 text-sm">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      {payslipDesignSettings.showCompanyLogo && companyLogoUrl && (
                        <img
                          src={companyLogoUrl}
                          alt="Company Logo"
                          style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
                          className="rounded-md"
                        />
                      )}
                      <div className={cn("text-right", !payslipDesignSettings.showCompanyLogo && "w-full")}>
                        <h2 className="text-md font-bold">{companyTradingName}</h2>
                        {payslipDesignSettings.showCompanyDetails && (
                          <>
                            <p className="text-xs">123 Corporate Ave, Business City, 1234</p>
                            <p className="text-xs">Reg. No: 2023/123456/07</p>
                            <p className="text-xs">Tax No: 9876543210</p>
                          </>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Employee Details */}
                    {payslipDesignSettings.showEmployeeDetails && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p><span className="font-semibold">Employee Name:</span> {getEmployeeName(payslip.employeeId)}</p>
                          <p><span className="font-semibold">Employee ID:</span> {payslip.employeeId}</p>
                          <p><span className="font-semibold">Job Title:</span> Software Developer</p> {/* Placeholder */}
                        </div>
                        <div className="text-right">
                          <p><span className="font-semibold">Pay Period:</span> {payslip.payPeriod}</p>
                          <p><span className="font-semibold">Pay Date:</span> 25/07/2024</p> {/* Placeholder */}
                          <p><span className="font-semibold">Tax Ref No:</span> 123456789</p> {/* Placeholder */}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Dynamic Sections */}
                    {(payslipDesignSettings.sectionOrder || ["Earnings", "Deductions", "Leave"]).map((section: string) =>
                      renderSection(section, payslip)
                    )}

                    <Separator />

                    {/* New: Individual Payslip Earnings Breakdown Chart */}
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-2">Earnings Breakdown</h4>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={payslip.earningsBreakdown}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#8884d8"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {payslip.earningsBreakdown.map((entry, index) => (
                              <Cell key={`cell-earnings-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* New: Individual Payslip Deductions Breakdown Chart */}
                    <div className="mt-4">
                      <h4 className="font-semibold text-sm mb-2">Deductions Breakdown</h4>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={payslip.deductionsBreakdown}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            fill="#82ca9d"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {payslip.deductionsBreakdown.map((entry, index) => (
                              <Cell key={`cell-deductions-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <Separator />

                    {/* Bank Details */}
                    {payslipDesignSettings.showBankDetails && (
                      <div className="border-t pt-2 mt-2">
                        <h4 className="font-semibold text-sm mb-1">Bank Details</h4>
                        <p className="text-xs">Bank: FNB</p>
                        <p className="text-xs">Account No: *********1234</p>
                        <p className="text-xs">Branch Code: 250655</p>
                      </div>
                    )}

                    <Separator />

                    {/* Net Pay (Always at bottom) */}
                    <div className="flex justify-between items-center pt-2 mt-2">
                      <h3 className="text-md font-bold">Net Pay</h3>
                      <h3 className="text-md font-bold">R {payslip.netPay.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payslip data available. Please enable mock data in settings or generate payslips.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-green-50 text-green-800">
        <h3 className="font-semibold text-lg mb-2">Payslip Management Area</h3>
        <p className="text-sm">
          Here you would find tools for selecting employees, defining pay periods, and initiating the payslip generation process. Historical payslips would also be accessible.
        </p>
      </div>
    </div>
  );
};

export default Payslips;