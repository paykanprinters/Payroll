"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import {
  generateMockCompanyDetails,
  generateMockEmployees,
  generateMockLoans,
  generateMockSavingPlans,
  generateMockLeaveRecords,
  generateMockPayslips,
  MockCompanyDetails, // Import interfaces for type safety
} from "@/lib/mock-data";


const MockData: React.FC = () => {
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  const applyMockData = () => {
    const mockCompany = generateMockCompanyDetails();
    const mockEmployees = generateMockEmployees();
    const mockLoans = generateMockLoans();
    const mockSavingPlans = generateMockSavingPlans();
    const mockLeaveRecords = generateMockLeaveRecords();
    console.log("MockData: Generated mockLeaveRecords:", mockLeaveRecords); // Added log
    const mockPayslips = generateMockPayslips(mockEmployees, mockLoans, mockSavingPlans, mockLeaveRecords);

    // Save company details
    Object.entries(mockCompany).forEach(([key, value]) => {
      localStorage.setItem(key, String(value));
    });
    localStorage.setItem("isMockDataEnabled", "true");
    localStorage.setItem("mockEmployees", JSON.stringify(mockEmployees));
    localStorage.setItem("mockLoans", JSON.stringify(mockLoans));
    localStorage.setItem("mockSavingPlans", JSON.stringify(mockSavingPlans));
    localStorage.setItem("mockLeaveRecords", JSON.stringify(mockLeaveRecords));
    console.log("MockData: Saved mockLeaveRecords to localStorage:", JSON.parse(localStorage.getItem("mockLeaveRecords") || '[]')); // Added log
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
    const mockCompanyKeys: (keyof MockCompanyDetails)[] = [
      "companyLegalName", "companyTradingName", "companyRegistrationNumber",
      "companyTaxNumber", "vatRegistrationNumber", "industry",
      "payeReferenceNumber", "uifReferenceNumber", "sdlReferenceNumber",
      "coidaRegistrationNumber", "physicalAddress", "postalAddress",
      "mainContactNumber", "alternativeContactNumber", "companyEmail",
      "companyWebsite", "bankName", "accountHolderName", "accountNumber",
      "branchCode", "accountType", "logoUrl", "logoSize"
    ];

    mockCompanyKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem("isMockDataEnabled");
    localStorage.removeItem("mockEmployees");
    localStorage.removeItem("mockLoans");
    localStorage.removeItem("mockSavingPlans");
    localStorage.removeItem("mockLeaveRecords");
    console.log("MockData: Cleared mockLeaveRecords from localStorage."); // Added log
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