"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  generateMockTimesheets,
  generateMockToDos,
  MockCompanyDetails,
  PayslipDesignSettings,
  MockEmployee,
  MockPayslip,
  Loan,
  SavingPlan,
  LeaveEntry,
  TimesheetEntry,
} from "@/lib/mock-data";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor"; // Import usePayrollProcessor to get taxTables


const MockData: React.FC = () => {
  const { taxTables } = usePayrollProcessor(); // Get taxTables from usePayrollProcessor
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    // Initialize from localStorage on first render
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  // Wrap these functions in useCallback to ensure they are stable
  const applyMockData = useCallback(() => {
    if (!taxTables) {
      showError("Tax tables not loaded. Cannot generate mock payslips accurately. Please fetch tax tables first.");
      return;
    }

    const mockCompany = generateMockCompanyDetails();
    const mockEmployees: MockEmployee[] = generateMockEmployees();
    const mockLoans: Loan[] = generateMockLoans(); // Generate new loan structure
    const mockSavingPlans: SavingPlan[] = generateMockSavingPlans();
    const mockLeaveRecords: LeaveEntry[] = generateMockLeaveRecords();
    const mockTimesheets: TimesheetEntry[] = generateMockTimesheets(mockEmployees);
    const mockPayslips: MockPayslip[] = generateMockPayslips(mockEmployees, mockLoans, mockSavingPlans, mockLeaveRecords, mockTimesheets, taxTables); // Pass taxTables
    const mockToDos = generateMockToDos(mockEmployees, mockPayslips, mockLeaveRecords, mockLoans, mockSavingPlans, mockTimesheets);

    // Store mock company details in localStorage (DO NOT touch Supabase here)
    Object.entries(mockCompany).forEach(([key, value]) => {
      localStorage.setItem(key, String(value));
    });
    localStorage.setItem("isMockDataEnabled", "true");
    localStorage.setItem("mockEmployees", JSON.stringify(mockEmployees));
    localStorage.setItem("mockLoans", JSON.stringify(mockLoans)); // Store new loan structure
    localStorage.setItem("mockSavingPlans", JSON.stringify(mockSavingPlans));
    localStorage.setItem("mockLeaveRecords", JSON.stringify(mockLeaveRecords));
    localStorage.setItem("mockPayslips", JSON.stringify(mockPayslips));
    localStorage.setItem("mockTimesheets", JSON.stringify(mockTimesheets));
    localStorage.setItem("mockToDos", JSON.stringify(mockToDos));
    localStorage.setItem("applyPAYE", "true");
    localStorage.setItem("applySDL", "true");
    // Set new logo properties
    localStorage.setItem("companyLogoWidth", mockCompany.logoWidth.toString());
    localStorage.setItem("companyLogoHeight", mockCompany.logoHeight.toString());
    localStorage.setItem("companyLogoFit", mockCompany.logoFit);


    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new Event('allMockDataUpdated')); // Dispatch new event
    showSuccess("Mock data populated successfully!");
  }, [taxTables]); // Dependency on taxTables

  const clearMockData = useCallback(() => {
    const mockCompanyKeys: (keyof MockCompanyDetails)[] = [
      "companyLegalName", "companyTradingName", "companyRegistrationNumber",
      "companyTaxNumber", "vatRegistrationNumber", "industry",
      "payeReferenceNumber", "uifReferenceNumber", "sdlReferenceNumber",
      "coidaRegistrationNumber", "physicalAddress", "postalAddress",
      "mainContactNumber", "alternativeContactNumber", "companyEmail",
      "companyWebsite", "bankName", "accountholdername", "accountNumber",
      "branchCode", "accountType", "logoUrl",
      "logoWidth", "logoHeight", "logoFit" // New logo properties
    ];

    // Clear mock company details from localStorage (DO NOT touch Supabase here)
    mockCompanyKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem("isMockDataEnabled");
    localStorage.removeItem("mockEmployees");
    localStorage.removeItem("mockLoans");
    localStorage.removeItem("mockSavingPlans");
    localStorage.removeItem("mockLeaveRecords");
    localStorage.removeItem("mockPayslips");
    localStorage.removeItem("mockTimesheets");
    localStorage.removeItem("mockToDos");
    localStorage.removeItem("applyPAYE");
    localStorage.removeItem("applySDL");

    const payslipLogoKeys: (keyof PayslipDesignSettings)[] = [
      "payslipLogoUrl", "payslipLogoWidth", "payslipLogoHeight", "payslipLogoFit"
    ];
    payslipLogoKeys.forEach(key => {
      localStorage.removeItem(`payslipDesign${key.charAt(0).toUpperCase() + key.slice(1)}`);
    });

    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new Event('allMockDataUpdated')); // Dispatch new event
    window.dispatchEvent(new Event('payslipDesignUpdated'));
    showSuccess("Mock data cleared successfully!");
  }, []); // No dependencies needed as it clears data

  // This useEffect is now only for initial setup, not for reacting to toggle changes
  useEffect(() => {
    const initialMockDataStatus = localStorage.getItem("isMockDataEnabled") === "true";
    setIsMockDataEnabled(initialMockDataStatus);
    // No need to call applyMockData/clearMockData here, as handleToggleChange will handle it on user interaction.
    // This prevents a potential loop on initial render if other components also trigger updates.
  }, []);


  const handleToggleChange = (checked: boolean) => {
    setIsMockDataEnabled(checked);
    if (checked) {
      applyMockData();
    } else {
      clearMockData();
    }
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