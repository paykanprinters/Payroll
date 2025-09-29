"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";

// Define mock data structures
interface MockCompanyDetails {
  companyLegalName: string;
  companyTradingName: string;
  companyRegistrationNumber: string;
  companyTaxNumber: string;
  vatRegistrationNumber: string;
  industry: string;
  payeReferenceNumber: string;
  uifReferenceNumber: string;
  sdlReferenceNumber: string;
  coidaRegistrationNumber: string;
  physicalAddress: string;
  postalAddress: string;
  mainContactNumber: string;
  alternativeContactNumber: string;
  companyEmail: string;
  companyWebsite: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  branchCode: string;
  accountType: "Cheque" | "Savings" | "Business";
  logoUrl: string;
  logoSize: number;
}

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  salary: number;
  startDate: string;
}

interface MockPayslip {
  id: string;
  employeeId: string;
  payPeriod: string;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  earningsBreakdown: { name: string; amount: number }[];
  deductionsBreakdown: { name: string; amount: number }[];
}

// Mock data generation functions
const generateMockCompanyDetails = (): MockCompanyDetails => ({
  companyLegalName: "Acme Corp (Pty) Ltd",
  companyTradingName: "Acme Payroll Solutions",
  companyRegistrationNumber: "2023/123456/07",
  companyTaxNumber: "9876543210",
  vatRegistrationNumber: "4000123456",
  industry: "Software & Payroll Services",
  payeReferenceNumber: "7000123456",
  uifReferenceNumber: "0123456/7",
  sdlReferenceNumber: "L123456789",
  coidaRegistrationNumber: "9876543210",
  physicalAddress: "123 Tech Park, Innovation Hub, Johannesburg, 2000",
  postalAddress: "PO Box 123, Business Centre, 2001",
  mainContactNumber: "+27 11 123 4567",
  alternativeContactNumber: "+27 87 654 3210",
  companyEmail: "info@acmecorp.co.za",
  companyWebsite: "https://www.acmecorp.co.za",
  bankName: "FNB",
  accountHolderName: "Acme Corp (Pty) Ltd",
  accountNumber: "62001234567",
  branchCode: "250655",
  accountType: "Business",
  logoUrl: "https://via.placeholder.com/150/0000FF/FFFFFF?text=ACME", // Placeholder logo
  logoSize: 50,
});

const generateMockEmployees = (): MockEmployee[] => [
  { id: "EMP001", firstName: "John", lastName: "Doe", email: "john.doe@acmecorp.co.za", jobTitle: "Software Engineer", salary: 45000, startDate: "2022-01-15" },
  { id: "EMP002", firstName: "Jane", lastName: "Smith", email: "jane.smith@acmecorp.co.za", jobTitle: "HR Manager", salary: 38000, startDate: "2021-03-01" },
  { id: "EMP003", firstName: "Peter", lastName: "Jones", email: "peter.jones@acmecorp.co.za", jobTitle: "Accountant", salary: 32000, startDate: "2023-07-20" },
  { id: "EMP004", firstName: "Sarah", lastName: "Brown", email: "sarah.brown@acmecorp.co.za", jobTitle: "Marketing Specialist", salary: 28000, startDate: "2022-11-10" },
  { id: "EMP005", firstName: "David", lastName: "Green", email: "david.green@acmecorp.co.za", jobTitle: "Operations Manager", salary: 40000, startDate: "2021-05-01" },
  { id: "EMP006", firstName: "Emily", lastName: "White", email: "emily.white@acmecorp.co.za", jobTitle: "Customer Support", salary: 25000, startDate: "2023-02-28" },
];

const generateMockPayslips = (employees: MockEmployee[]): MockPayslip[] => {
  const payslips: MockPayslip[] = [];
  const payPeriod = "2024-07-01 - 2024-07-31";

  employees.forEach(emp => {
    const grossEarnings = emp.salary;
    const paye = grossEarnings * 0.15; // Simplified PAYE
    const uif = Math.min(grossEarnings * 0.01, 177.12); // Simplified UIF cap
    const sdl = grossEarnings * 0.01; // Simplified SDL
    const providentFund = grossEarnings * 0.075; // Simplified Provident Fund
    const totalDeductions = paye + uif + sdl + providentFund;
    const netPay = grossEarnings - totalDeductions;

    payslips.push({
      id: `PS-${emp.id}-202407`,
      employeeId: emp.id,
      payPeriod: payPeriod,
      grossEarnings: grossEarnings,
      totalDeductions: totalDeductions,
      netPay: netPay,
      earningsBreakdown: [
        { name: "Basic Salary", amount: emp.salary },
      ],
      deductionsBreakdown: [
        { name: "PAYE", amount: paye },
        { name: "UIF", amount: uif },
        { name: "SDL", amount: sdl },
        { name: "Provident Fund", amount: providentFund },
      ],
    });
  });
  return payslips;
};

const MockData: React.FC = () => {
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  const applyMockData = () => {
    const mockCompany = generateMockCompanyDetails();
    const mockEmployees = generateMockEmployees();
    const mockPayslips = generateMockPayslips(mockEmployees);

    // Save company details
    Object.entries(mockCompany).forEach(([key, value]) => {
      localStorage.setItem(key, String(value));
    });
    localStorage.setItem("isMockDataEnabled", "true");
    localStorage.setItem("mockEmployees", JSON.stringify(mockEmployees));
    localStorage.setItem("mockPayslips", JSON.stringify(mockPayslips));
    localStorage.setItem("applyPAYE", "true"); // Enable PAYE for mock data
    localStorage.setItem("applySDL", "true"); // Enable SDL for mock data

    // Dispatch events to update components
    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new Event('mockDataUpdated')); // Generic event for other components
    console.log("MockData: Dispatched 'mockDataUpdated' event.");
    showSuccess("Mock data populated successfully!");
  };

  const clearMockData = () => {
    // Clear company details
    const mockCompany = generateMockCompanyDetails(); // Use schema to get keys
    Object.keys(mockCompany).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem("isMockDataEnabled");
    localStorage.removeItem("mockEmployees");
    localStorage.removeItem("mockPayslips");
    localStorage.removeItem("applyPAYE");
    localStorage.removeItem("applySDL");

    // Dispatch events to update components
    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new Event('mockDataUpdated')); // Generic event for other components
    console.log("MockData: Dispatched 'mockDataUpdated' event (cleared).");
    showSuccess("Mock data cleared successfully!");
  };

  useEffect(() => {
    if (isMockDataEnabled) {
      applyMockData();
    } else {
      clearMockData();
    }
  }, [isMockDataEnabled]); // Only run when isMockDataEnabled changes

  const handleToggleChange = (checked: boolean) => {
    setIsMockDataEnabled(checked);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mock Data</CardTitle>
        <CardDescription>
          Enable this switch to populate the entire system with sample data for testing and review purposes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor="mock-data-toggle">Enable Mock Data</Label>
          <Switch
            id="mock-data-toggle"
            checked={isMockDataEnabled}
            onCheckedChange={handleToggleChange}
          />
        </div>
        <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
          <h3 className="font-semibold text-lg mb-2">Important Note:</h3>
          <p className="text-sm">
            Enabling mock data will overwrite certain `localStorage` values for company details, employees, and payslips. Disabling it will clear this mock data. This is for front-end demonstration only and does not interact with any real backend or database.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MockData;