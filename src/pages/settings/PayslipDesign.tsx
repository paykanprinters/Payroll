"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { showSuccess } from "@/utils/toast";
import { PayslipDesignSettings, MockPayslip, MockCompanyDetails, MockEmployee } from "@/lib/mock-data-interfaces"; // Import the updated interface
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard"; // Import IndividualPayslipCard
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import { seedKanBrandLogo } from "@/lib/seed-kan-logo";
import { useAuth } from "@/hooks/use-auth";

// Import new modular components
import PayslipLayoutOptions from "@/components/settings/payslip-design/PayslipLayoutOptions";
import PayslipVisibilityOptions from "@/components/settings/payslip-design/PayslipVisibilityOptions";
import PayslipSectionOrder from "@/components/settings/payslip-design/PayslipSectionOrder";
import PayslipLogoSettings from "@/components/settings/payslip-design/PayslipLogoSettings";

// Define default settings for payslip elements
const defaultPayslipSettings: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true,
  showBankDetails: true,
  showYTD: true,
  showHourlyRate: true,
  showEmployeeIdNumber: false,
  showEmployeeTaxRefNumber: false,
  showEmployeeAddress: false,
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
  payslipLogoUrl: '',
  payslipLogoWidth: 180,
  payslipLogoHeight: 60,
  payslipLogoFit: 'contain',
};

type SectionName = "Earnings" | "Deductions"; // Only Earnings and Deductions are orderable

const PayslipDesign: React.FC = () => {
  const { settings: liveSettings, setSettings: setLiveSettings, isLoading, save } = usePayslipDesignSettings();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PayslipDesignSettings>(defaultPayslipSettings);

  useEffect(() => {
    if (user?.role !== "Admin") return;
    seedKanBrandLogo().then((result) => {
      if (result.ok && result.logoUrl && !result.skipped) {
        setSettings((prev) => ({
          ...prev,
          payslipLogoUrl: result.logoUrl!,
          payslipLogoWidth: 180,
          payslipLogoHeight: 60,
          payslipLogoFit: "contain",
        }));
      }
    });
  }, [user?.role]);

  useEffect(() => {
    setSettings(liveSettings);
  }, [liveSettings]);

  // Handlers for state changes
  const handleToggleChange = (key: keyof PayslipDesignSettings, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleLayoutSizeChange = (value: "Letter" | "A4" | "A5") => {
    setSettings((prev) => ({ ...prev, layoutSize: value }));
  };

  const handleEarningsDeductionsLayoutChange = (value: "deductions-left-earnings-right" | "earnings-left-deductions-right") => {
    setSettings((prev) => ({ ...prev, earningsDeductionsLayout: value }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    setSettings((prev) => {
      const newOrder = [...prev.sectionOrder];
      const [movedItem] = newOrder.splice(index, 1);
      if (direction === "up" && index > 0) {
        newOrder.splice(index - 1, 0, movedItem);
      } else if (direction === "down" && index < newOrder.length - 1) {
        newOrder.splice(index + 1, 0, movedItem);
      } else {
        newOrder.splice(index, 0, movedItem); // Put it back if no move
      }
      return { ...prev, sectionOrder: newOrder };
    });
  };

  const handlePayslipLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSettings(prev => ({ ...prev, payslipLogoUrl: dataUrl }));
        showSuccess("Payslip logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePayslipLogo = () => {
    setSettings(prev => ({ ...prev, payslipLogoUrl: '', payslipLogoWidth: 100, payslipLogoHeight: 50, payslipLogoFit: 'contain' }));
    showSuccess("Payslip logo removed successfully!");
  };

  const handlePayslipLogoWidthChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, payslipLogoWidth: value[0] }));
  };

  const handlePayslipLogoHeightChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, payslipLogoHeight: value[0] }));
  };

  const handlePayslipLogoFitChange = (value: "contain" | "cover" | "fill" | "none" | "scale-down") => {
    setSettings(prev => ({ ...prev, payslipLogoFit: value }));
  };

  const handleSaveSettings = async () => {
    // Persist to Supabase (live)
    await save(settings);
  };

  // Mock data for IndividualPayslipCard preview
  const mockCompanyDetails: MockCompanyDetails = {
    id: "mock-company-id",
    companyLegalName: localStorage.getItem('companyLegalName') || "Your Company Legal Name",
    companyTradingName: localStorage.getItem('companyTradingName') || "Your Company Name",
    companyRegistrationNumber: localStorage.getItem('companyRegistrationNumber') || "N/A",
    vatRegistrationNumber: localStorage.getItem('vatRegistrationNumber') || "N/A",
    physicalAddress: localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234",
    mainContactNumber: localStorage.getItem('mainContactNumber') || "+27 11 123 4567",
    companyEmail: localStorage.getItem('companyEmail') || "info@yourcompany.co.za",
    companyWebsite: localStorage.getItem('companyWebsite') || "www.yourcompany.co.za",
    logoUrl: localStorage.getItem('companyLogoUrl') || '',
    logoWidth: parseFloat(localStorage.getItem('companyLogoWidth') || '100'),
    logoHeight: parseFloat(localStorage.getItem('companyLogoHeight') || '50'),
    logoFit: (localStorage.getItem('companyLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || 'contain',
    // Add other required fields with mock values or defaults
    taxYearStartMonth: 1,
    taxYearEndMonth: 12,
    uifThreshold: 17712,
    sarsEfilingNumber: '1234567890',
    payeThreshold: 87300,
    sdlRate: 0.01,
    uifRate: 0.01,
    payeRates: [], // Mock empty array
    companyBankName: 'Mock Bank',
    companyBankAccountNumber: '1234567890',
    companyBankBranchCode: '123456',
    companyBankAccountType: 'Cheque',
    companyBankSwiftCode: 'MOCKZAJJ',
    companyBankIban: 'MOCK1234567890',
  };

  const mockEmployee: MockEmployee = {
    id: "emp001",
    customEmployeeId: "EMP001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    jobTitle: "Software Developer",
    salary: 20000,
    hourlyRate: 150,
    startDate: "2023-01-01",
    idNumber: "9001015000087",
    phoneNumber: "0821234567",
    emergencyContactName: "Jane Doe",
    emergencyContactNumber: "0837654321",
    emergencyContactAddress: "456 Oak Ave",
    addressLine1: "789 Pine St",
    addressLine2: "Apt 101",
    city: "Business City",
    province: "Gauteng",
    postalCode: "1234",
    taxReferenceNumber: "1234567890",
    uifNumber: "987654321",
    bankName: "FNB",
    bankAccountHolder: "John Doe",
    accountNumber: "ZA12345678901234567890", // Corrected from ibanNumber
    branchCode: "250655", // Corrected from routingSwiftCode
    bankAccountType: "Cheque",
    dateOfBirth: "1990-01-01",
    gender: "Male",
    department: "IT",
    workLocation: "Office",
    dateOfConfirmation: "2023-04-01",
    originCountry: "South Africa",
    employmentType: "Permanent",
    portalAccess: true,
    permanentAddress: "789 Pine St, Apt 101, Business City, Gauteng, 1234",
    paymentMode: "Bank Transfer",
    payFrequency: "Monthly",
    standardDailyHours: 8,
    ignoredIncompleteFields: [],
  };

  const mockPayslip: MockPayslip = {
    id: "ps-mock-001",
    employeeId: "emp001",
    payPeriod: "01/07/2024 - 31/07/2024",
    payDate: "25/07/2024",
    grossEarnings: 22500.00,
    totalDeductions: 4877.12,
    netPay: 17622.88,
    earningsBreakdown: [
      { name: "Basic Salary", amount: 20000.00 },
      { name: "Travel Allowance", amount: 2000.00 },
      { name: "Overtime", amount: 500.00 },
    ],
    deductionsBreakdown: [
      { name: "PAYE", amount: 3000.00 },
      { name: "UIF", amount: 177.12 },
      { name: "SDL", amount: 200.00 },
      { name: "Provident Fund", amount: 1500.00 },
    ],
    leaveSummary: {
      annual: 15,
      sick: 10,
      unpaid: 0,
    },
    ytdGrossEarnings: 157500.00,
    ytdTotalDeductions: 43877.12,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payslip Design</CardTitle>
          <CardDescription>
            Customize the layout and content of your employee payslips.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Section */}
          <div className="space-y-6">
            <PayslipLayoutOptions
              settings={settings}
              onLayoutSizeChange={handleLayoutSizeChange}
              onEarningsDeductionsLayoutChange={handleEarningsDeductionsLayoutChange}
            />

            <Separator />

            <PayslipVisibilityOptions
              settings={settings}
              onToggleChange={handleToggleChange}
            />

            <Separator />

            <PayslipSectionOrder
              sectionOrder={settings.sectionOrder}
              onMoveSection={handleMoveSection}
            />

            <Separator />

            <PayslipLogoSettings
              settings={settings}
              onPayslipLogoUpload={handlePayslipLogoUpload}
              onRemovePayslipLogo={handleRemovePayslipLogo}
              onPayslipLogoWidthChange={handlePayslipLogoWidthChange}
              onPayslipLogoHeightChange={handlePayslipLogoHeightChange}
              onPayslipLogoFitChange={handlePayslipLogoFitChange}
            />

            <Button onClick={handleSaveSettings} className="w-full" disabled={isLoading}>
              Save Payslip Design
            </Button>
          </div>

          {/* Payslip Preview */}
          <div className="flex justify-center items-start">
            <IndividualPayslipCard
              payslip={mockPayslip}
              payslipDesignSettings={settings}
              companyDetails={mockCompanyDetails}
              employees={[mockEmployee]} // Pass mock employee for context
              getEmployeeName={(id) => id === "emp001" ? "John Doe" : "Unknown"}
              isPdfGeneration={false} // This is for UI preview
            />
          </div>
        </CardContent>
      </Card>
      <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Payslip Generation:</h3>
        <p className="text-sm">
          This "Payslip Design" section provides a visual preview and configuration options for how payslips *would* appear. The actual generation of payslips with dynamic data, complex calculations, and pixel-perfect rendering based on these settings would require a dedicated backend service and a robust reporting engine (e.g., PDF generation libraries). The settings saved here would be consumed by such a backend to produce the final payslip documents.
        </p>
      </div>
    </div>
  );
};

export default PayslipDesign;