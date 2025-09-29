"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

const Payslips: React.FC = () => {
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslipDesignSettings, setPayslipDesignSettings] = useState<any>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : {};
  });

  const loadPayslipsAndEmployees = () => {
    const storedPayslips = localStorage.getItem("mockPayslips");
    if (storedPayslips) {
      setPayslips(JSON.parse(storedPayslips));
    } else {
      setPayslips([]);
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payslip Generation & History</h1>
      <p className="text-lg text-muted-foreground">
        Generate new payslips, view historical payslips, and manage payroll periods.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Generated Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payslips.map((payslip) => (
                <div key={payslip.id} className="p-6 border rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
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