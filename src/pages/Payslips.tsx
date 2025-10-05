"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import new modular components
import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard"; // Import IndividualPayslipCard directly
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces"; // Import MockCompanyDetails
import { ReportDesignSettings } from "@/lib/report-design-interfaces"; // Import ReportDesignSettings

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

const defaultPayslipSettings: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true, // Now controlled by a toggle
  showBankDetails: true, // Now controlled by a toggle
  showYTD: true, // New setting for YTD calculations
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
};

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
};

const Payslips: React.FC = () => {
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null); // New state for company details
  const [payslipDesignSettings, setPayslipDesignSettings] = useState<PayslipDesignSettings>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings;
  });
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS); // State for report design settings
  const [payrollSummaryData, setPayrollSummaryData] = useState<{ name: string; gross: number; net: number }[]>([]);
  const [deductionsBreakdownData, setDeductionsBreakdownData] = useState<{ name: string; value: number }[]>([]);
  const [isIrp5ExportEnabled, setIsIrp5ExportEnabled] = useState<boolean>(() => {
    return localStorage.getItem("enableIrp5Export") === "true";
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");

  const loadPayslipsAndEmployees = () => {
    const storedPayslips = localStorage.getItem("mockPayslips");
    if (storedPayslips) {
      const loadedPayslips: MockPayslip[] = JSON.parse(storedPayslips);
      setPayslips(loadedPayslips);

      const totalGross = loadedPayslips.reduce((sum, p) => sum + p.grossEarnings, 0);
      const totalNet = loadedPayslips.reduce((sum, p) => sum + p.netPay, 0);
      setPayrollSummaryData([
        { name: "Total Payroll", gross: totalGross, net: totalNet },
      ]);

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

  const loadCompanyDetails = () => {
    const companyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
    const companyTradingName = localStorage.getItem('companyTradingName') || "";
    const companyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
    const vatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
    const physicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
    const postalAddress = localStorage.getItem('postalAddress') || "PO Box 123, Business Centre, 2001";
    const mainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
    const alternativeContactNumber = localStorage.getItem('alternativeContactNumber') || "";
    const companyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
    const companyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";
    const bankName = localStorage.getItem('bankName') || "";
    const accountHolderName = localStorage.getItem('accountHolderName') || "";
    const accountNumber = localStorage.getItem('accountNumber') || "";
    const branchCode = localStorage.getItem('branchCode') || "";
    const accountType = (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque";
    const logoUrl = localStorage.getItem('companyLogoUrl') || '';
    const logoSize = parseFloat(localStorage.getItem('companyLogoSize') || '40');

    setCompanyDetails({
      companyLegalName, companyTradingName, companyRegistrationNumber,
      companyTaxNumber: localStorage.getItem('companyTaxNumber') || "", // Added missing field
      vatRegistrationNumber, industry: localStorage.getItem('industry') || "", // Added missing field
      payeReferenceNumber: localStorage.getItem('payeReferenceNumber') || "", // Added missing field
      uifReferenceNumber: localStorage.getItem('uifReferenceNumber') || "", // Added missing field
      sdlReferenceNumber: localStorage.getItem('sdlReferenceNumber') || "", // Added missing field
      coidaRegistrationNumber: localStorage.getItem('coidaRegistrationNumber') || "", // Added missing field
      physicalAddress, postalAddress, mainContactNumber, alternativeContactNumber,
      companyEmail, companyWebsite, bankName, accountHolderName, accountNumber,
      branchCode, accountType, logoUrl, logoSize,
    });
  };

  const loadPayslipDesignSettings = () => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    setPayslipDesignSettings(savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings);
  };

  const loadReportDesignSettings = () => {
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  };

  useEffect(() => {
    loadPayslipsAndEmployees();
    loadCompanyDetails(); // Load company details
    loadPayslipDesignSettings();
    loadReportDesignSettings(); // Load report design settings
    setIsIrp5ExportEnabled(localStorage.getItem("enableIrp5Export") === "true"); // Load IRP5 setting

    const handleMockDataUpdate = () => {
      loadPayslipsAndEmployees();
      loadCompanyDetails();
      setIsIrp5ExportEnabled(localStorage.getItem("enableIrp5Export") === "true");
    };
    const handleCompanyDetailsUpdate = () => {
      loadCompanyDetails();
    };
    const handlePayslipDesignUpdate = () => {
      loadPayslipDesignSettings();
    };
    const handleIrp5SettingsUpdate = () => {
      setIsIrp5ExportEnabled(localStorage.getItem("enableIrp5Export") === "true");
    };

    window.addEventListener('mockDataUpdated', handleMockDataUpdate);
    window.addEventListener('companyDetailsUpdated', handleCompanyDetailsUpdate); // Listen for company detail updates
    window.addEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
    window.addEventListener('irp5SettingsUpdated', handleIrp5SettingsUpdate); // Listen for IRP5 setting updates

    return () => {
      window.removeEventListener('mockDataUpdated', handleMockDataUpdate);
      window.removeEventListener('companyDetailsUpdated', handleCompanyDetailsUpdate);
      window.removeEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
      window.removeEventListener('irp5SettingsUpdated', handleIrp5SettingsUpdate);
    };
  }, []);

  // Effect to reset selected payslip if employee changes or payslips update
  useEffect(() => {
    if (selectedEmployeeId) {
      const employeePayslips = payslips.filter(p => p.employeeId === selectedEmployeeId);
      if (!employeePayslips.some(p => p.id === selectedPayslipId)) {
        setSelectedPayslipId("");
      }
    } else {
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, payslips, selectedPayslipId]);


  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const selectedPayslipForPreview = payslips.find(p => p.id === selectedPayslipId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payslip Generation & History</h1>
      <p className="text-lg text-muted-foreground">
        Generate new payslips, view historical payslips, and manage payroll periods.
      </p>

      <PayslipSummaryCharts
        payrollSummaryData={payrollSummaryData}
        deductionsBreakdownData={deductionsBreakdownData}
      />

      {companyDetails && ( // Only render if companyDetails are loaded
        <PayslipGenerationSection
          employees={employees}
          payslips={payslips}
          selectedEmployeeId={selectedEmployeeId}
          setSelectedEmployeeId={setSelectedEmployeeId}
          selectedPayslipId={selectedPayslipId}
          setSelectedPayslipId={setSelectedPayslipId}
          getEmployeeName={getEmployeeName}
          payslipDesignSettings={payslipDesignSettings}
          companyDetails={companyDetails} // Pass all company details
          allEmployees={employees}
          isIrp5ExportEnabled={isIrp5ExportEnabled} // Pass IRP5 setting
          reportDesignSettings={reportDesignSettings} // Pass report design settings
        />
      )}

      {selectedPayslipForPreview && companyDetails && ( // Only render if companyDetails are loaded
        <Card>
          <CardHeader>
            <CardTitle>Payslip Preview</CardTitle>
            <CardDescription>
              Preview of the selected payslip for {getEmployeeName(selectedPayslipForPreview.employeeId)} - {selectedPayslipForPreview.payPeriod}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <IndividualPayslipCard
              payslip={selectedPayslipForPreview}
              payslipDesignSettings={payslipDesignSettings}
              companyDetails={companyDetails} // Pass all company details
              employees={employees}
              getEmployeeName={getEmployeeName}
              isPdfGeneration={false} // Indicate that this is for UI preview
            />
          </CardContent>
        </Card>
      )}

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