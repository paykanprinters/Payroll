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
import { usePayrollProcessor, TaxTables } from "@/hooks/use-payroll-processor"; // Import usePayrollProcessor and TaxTables


const MockData: React.FC = () => {
  const { taxTables } = usePayrollProcessor(); // Get taxTables from usePayrollProcessor
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    // Initialize from localStorage on first render
    return localStorage.getItem("isMockDataEnabled") === "true";
  });

  // Define mock tax tables directly in MockData.tsx for strict isolation
  const internalMockTaxTables: TaxTables = {
    payeBrackets: [
      { min_income: 0, max_income: 237100, rate: 0.18, deduction: 0 },
      { min_income: 237101, max_income: 370500, rate: 0.26, deduction: 42678 },
      { min_income: 370501, max_income: 512800, rate: 0.31, deduction: 77362 },
      { min_income: 512801, max_income: 673100, rate: 0.36, deduction: 121424 },
      { min_income: 673101, max_income: 857900, rate: 0.41, deduction: 179147 },
      { min_income: 857901, max_income: 1817000, rate: 0.45, deduction: 255073 },
      { min_income: 1817001, max_income: null, rate: 0.45, deduction: 681403 },
    ],
    uifSdlRates: {
      uif_rate: 0.01,
      uif_cap: 177.12, // Monthly cap
      sdl_rate: 0.01,
    },
  };

  // Wrap these functions in useCallback to ensure they are stable
  const applyMockData = useCallback(() => {
    // No need to check taxTables here, as we'll use internalMockTaxTables for mock payslips
    // if (!taxTables) {
    //   showError("Tax tables not loaded. Cannot generate mock payslips accurately. Please fetch tax tables first.");
    //   return;
    // }

    const mockCompany = generateMockCompanyDetails();
    const mockEmployees: MockEmployee[] = generateMockEmployees();
    const mockLoans: Loan[] = generateMockLoans(); // Generate new loan structure
    const mockSavingPlans: SavingPlan[] = generateMockSavingPlans();
    const mockLeaveRecords: LeaveEntry[] = generateMockLeaveRecords();
    const mockTimesheets: TimesheetEntry[] = generateMockTimesheets(mockEmployees);
    // Pass internalMockTaxTables for mock payslip generation
    const mockPayslips: MockPayslip[] = generateMockPayslips(mockEmployees, mockLoans, mockSavingPlans, mockLeaveRecords, mockTimesheets, internalMockTaxTables);
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
    window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: mockEmployees }));
    window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: mockPayslips }));
    window.dispatchEvent(new CustomEvent('loansUpdated', { detail: mockLoans }));
    window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: mockSavingPlans }));
    window.dispatchEvent(new CustomEvent('leaveRecordsUpdated', { detail: mockLeaveRecords }));
    window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: mockTimesheets }));
    window.dispatchEvent(new CustomEvent('toDosUpdated', { detail: mockToDos }));
    window.dispatchEvent(new Event('allMockDataUpdated')); // Dispatch new event
    showSuccess("Mock data populated successfully!");
  }, [internalMockTaxTables]); // Dependency on internalMockTaxTables

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
    window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: [] }));
    window.dispatchEvent(new Event('payslipsUpdated'));
    window.dispatchEvent(new Event('loansUpdated'));
    window.dispatchEvent(new Event('savingPlansUpdated'));
    window.dispatchEvent(new Event('leaveRecordsUpdated'));
    window.dispatchEvent(new Event('timesheetsUpdated'));
    window.dispatchEvent(new Event('toDosUpdated'));
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