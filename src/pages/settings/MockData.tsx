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
import { usePayrollProcessor, TaxTables } from "@/hooks/use-payroll-processor";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries"; // New import

const MockData: React.FC = () => {
  const { taxTables, companyDetails } = usePayrollProcessor();
  const [isMockDataEnabled, setIsMockDataEnabled] = useState<boolean>(() => {
    const initial = localStorage.getItem("isMockDataEnabled") === "true";
    return initial;
  });

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
    taxYearDetails: { // Mock tax year details with rebates
      year: new Date().getFullYear(),
      start_date: `${new Date().getFullYear()}-03-01`,
      end_date: `${new Date().getFullYear() + 1}-02-28`,
      description: "SARS Tax Year (Mock Data)",
      rebates: {
        under65: 16425,
        sixtyFiveToSeventyFour: 9033,
        seventyFivePlus: 2994,
      },
    },
  };

  const internalMockUserTaxSettings: UserTaxSettings = { // Define mock user tax settings
    userId: 'mock-user',
    applyPaye: true,
    applySdl: true,
    enableIrp5Export: true, // Enable IRP5 export by default in mock
    irp5ContentFontSize: 12,
  };

  const applyMockData = useCallback(() => {
    const mockCompany = generateMockCompanyDetails();
    const companyNameForId = mockCompany.companyLegalName || mockCompany.companyTradingName || "Acme Corp";
    const mockEmployees: MockEmployee[] = generateMockEmployees(companyNameForId);
    const mockLoans: Loan[] = generateMockLoans();
    const mockSavingPlans: SavingPlan[] = generateMockSavingPlans();
    const mockLeaveRecords: LeaveEntry[] = generateMockLeaveRecords();
    const mockTimesheets: TimesheetEntry[] = generateMockTimesheets(mockEmployees);
    const mockPayslips: MockPayslip[] = generateMockPayslips(mockEmployees, mockLoans, mockSavingPlans, mockLeaveRecords, mockTimesheets, internalMockTaxTables, internalMockUserTaxSettings); // Pass user tax settings
    const mockToDos = generateMockToDos(mockEmployees, mockPayslips, mockLeaveRecords, mockLoans, mockSavingPlans, mockTimesheets);

    Object.entries(mockCompany).forEach(([key, value]) => {
      localStorage.setItem(key, String(value));
    });
    localStorage.setItem("isMockDataEnabled", "true");
    localStorage.setItem("mockEmployees", JSON.stringify(mockEmployees));
    localStorage.setItem("mockLoans", JSON.stringify(mockLoans));
    localStorage.setItem("mockSavingPlans", JSON.stringify(mockSavingPlans));
    localStorage.setItem("mockLeaveRecords", JSON.stringify(mockLeaveRecords));
    localStorage.setItem("mockPayslips", JSON.stringify(mockPayslips));
    localStorage.setItem("mockTimesheets", JSON.stringify(mockTimesheets));
    localStorage.setItem("mockToDos", JSON.stringify(mockToDos));
    
    // Save user tax settings to localStorage
    localStorage.setItem("userTaxSettings", JSON.stringify(internalMockUserTaxSettings));

    localStorage.setItem("companyLogoWidth", mockCompany.logoWidth.toString());
    localStorage.setItem("companyLogoHeight", mockCompany.logoHeight.toString());
    localStorage.setItem("companyLogoFit", mockCompany.logoFit);
    localStorage.setItem("reportDesignIncludeLogo", "true");
    localStorage.setItem("reportDesignIncludeDetails", "true");


    window.dispatchEvent(new Event('companyDetailsUpdated'));
    window.dispatchEvent(new CustomEvent('employeesUpdated', { detail: mockEmployees }));
    window.dispatchEvent(new CustomEvent('payslipsUpdated', { detail: mockPayslips }));
    window.dispatchEvent(new CustomEvent('loansUpdated', { detail: mockLoans }));
    window.dispatchEvent(new CustomEvent('savingPlansUpdated', { detail: mockSavingPlans }));
    window.dispatchEvent(new CustomEvent('leaveRecordsUpdated', { detail: mockLeaveRecords }));
    window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: mockTimesheets }));
    window.dispatchEvent(new CustomEvent('toDosUpdated', { detail: mockToDos }));
    window.dispatchEvent(new Event('allMockDataUpdated'));
    window.dispatchEvent(new Event('reportDesignUpdated'));
    window.dispatchEvent(new Event('userTaxSettingsUpdated')); // Dispatch event for user tax settings
    showSuccess("Mock data populated successfully!");
  }, [internalMockTaxTables, internalMockUserTaxSettings]);

  const clearMockData = useCallback(() => {
    const mockCompanyKeys: (keyof MockCompanyDetails)[] = [
      "companyLegalName", "companyTradingName", "companyRegistrationNumber",
      "companyTaxNumber", "vatRegistrationNumber", "industry",
      "payeReferenceNumber", "uifReferenceNumber", "sdlReferenceNumber",
      "coidaRegistrationNumber", "physicalAddress", "postalAddress",
      "mainContactNumber", "alternativeContactNumber", "companyEmail",
      "companyWebsite", "bankName", "accountholdername", "accountNumber",
      "branchCode", "accountType", "logoUrl",
      "logoWidth", "logoHeight", "logoFit"
    ];

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
    
    // Clear user tax settings from localStorage
    localStorage.removeItem("userTaxSettings");

    localStorage.removeItem("applyPAYE");
    localStorage.removeItem("applySDL");
    localStorage.removeItem("reportDesignIncludeLogo");
    localStorage.removeItem("reportDesignIncludeDetails");


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
    window.dispatchEvent(new Event('allMockDataUpdated'));
    window.dispatchEvent(new Event('payslipDesignUpdated'));
    window.dispatchEvent(new Event('reportDesignUpdated'));
    window.dispatchEvent(new Event('userTaxSettingsUpdated')); // Dispatch event for user tax settings
    showSuccess("Mock data cleared successfully!");
  }, [internalMockTaxTables, internalMockUserTaxSettings]);

  useEffect(() => {
    const initialMockDataStatus = localStorage.getItem("isMockDataEnabled") === "true";
    setIsMockDataEnabled(initialMockDataStatus);
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