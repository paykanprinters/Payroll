"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import new modular components
import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard"; // Import IndividualPayslipCard directly
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces"; // Import MockCompanyDetails
import { ReportDesignSettings } from "@/lib/report-design-interfaces"; // Import ReportDesignSettings
import { showError } from "@/utils/toast"; // Import showError

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
  showHourlyRate: true,
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
  payslipLogoUrl: '',
  payslipLogoWidth: 100,
  payslipLogoHeight: 50,
  payslipLogoFit: 'contain',
};

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12, // Added irp5ContentFontSize
};

const PayslipOverviewPage: React.FC = () => {
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

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");

  const loadPayslipsAndEmployees = useCallback(() => {
    const storedPayslips = localStorage.getItem("mockPayslips");
    console.log("PayslipOverviewPage: Loading payslips. Raw storedPayslips:", storedPayslips);
    if (storedPayslips) {
      try {
        const loadedPayslips: MockPayslip[] = JSON.parse(storedPayslips);
        setPayslips(loadedPayslips);
        console.log("PayslipOverviewPage: Loaded payslips count:", loadedPayslips.length);

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

      } catch (error) {
        console.error("PayslipOverviewPage: Error parsing mockPayslips from localStorage:", error);
        setPayslips([]);
        setPayrollSummaryData([]);
        setDeductionsBreakdownData([]);
        showError("Failed to load payslip data. Please check browser console for details.");
      }
    } else {
      console.log("PayslipOverviewPage: No mockPayslips found in localStorage.");
      setPayslips([]);
      setPayrollSummaryData([]);
      setDeductionsBreakdownData([]);
    }

    const storedEmployees = localStorage.getItem("mockEmployees");
    console.log("PayslipOverviewPage: Loading employees. Raw storedEmployees:", storedEmployees);
    if (storedEmployees) {
      try {
        setEmployees(JSON.parse(storedEmployees));
        console.log("PayslipOverviewPage: Loaded employees count:", JSON.parse(storedEmployees).length);
      } catch (error) {
        console.error("PayslipOverviewPage: Error parsing mockEmployees from localStorage:", error);
        setEmployees([]);
        showError("Failed to load employee data. Please check browser console for details.");
      }
    } else {
      console.log("PayslipOverviewPage: No mockEmployees found in localStorage.");
      setEmployees([]);
    }
  }, []);

  const loadCompanyDetails = useCallback(() => {
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
    const logoWidth = parseFloat(localStorage.getItem('companyLogoWidth') || '100');
    const logoHeight = parseFloat(localStorage.getItem('companyLogoHeight') || '50');
    const logoFit = (localStorage.getItem('companyLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || "contain";

    setCompanyDetails({
      companyLegalName, companyTradingName, companyRegistrationNumber,
      companyTaxNumber: localStorage.getItem('companyTaxNumber') || "",
      vatRegistrationNumber, industry: localStorage.getItem('industry') || "",
      payeReferenceNumber: localStorage.getItem('payeReferenceNumber') || "",
      uifReferenceNumber: localStorage.getItem('uifReferenceNumber') || "",
      sdlReferenceNumber: localStorage.getItem('sdlReferenceNumber') || "",
      coidaRegistrationNumber: localStorage.getItem('coidaRegistrationNumber') || "",
      physicalAddress, postalAddress, mainContactNumber, alternativeContactNumber,
      companyEmail, companyWebsite, bankName, accountHolderName, accountNumber,
      branchCode, accountType, logoUrl, logoWidth, logoHeight, logoFit,
    });
  }, []);

  const loadPayslipDesignSettings = useCallback(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    setPayslipDesignSettings(savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings);
  }, []);

  const loadReportDesignSettings = useCallback(() => {
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  }, []);

  useEffect(() => {
    loadPayslipsAndEmployees();
    loadCompanyDetails();
    loadPayslipDesignSettings();
    loadReportDesignSettings();

    const handleMockDataUpdate = () => {
      loadPayslipsAndEmployees();
      loadCompanyDetails();
    };
    const handleCompanyDetailsUpdate = () => {
      loadCompanyDetails();
    };
    const handlePayslipDesignUpdate = () => {
      loadPayslipDesignSettings();
    };
    const handleReportDesignUpdate = () => {
      loadReportDesignSettings();
    };

    window.addEventListener('mockDataUpdated', handleMockDataUpdate);
    window.addEventListener('companyDetailsUpdated', handleCompanyDetailsUpdate);
    window.addEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
    window.addEventListener('reportDesignUpdated', handleReportDesignUpdate);

    return () => {
      window.removeEventListener('mockDataUpdated', handleMockDataUpdate);
      window.removeEventListener('companyDetailsUpdated', handleCompanyDetailsUpdate);
      window.removeEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
      window.removeEventListener('reportDesignUpdated', handleReportDesignUpdate);
    };
  }, [loadPayslipsAndEmployees, loadCompanyDetails, loadPayslipDesignSettings, loadReportDesignSettings]);

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
    return employee ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
  };

  const selectedPayslipForPreview = payslips.find(p => p.id === selectedPayslipId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payslip Overview</h1>
      <p className="text-lg text-muted-foreground">
        Generate new payslips, view historical payslips, and manage payroll periods.
      </p>

      {payslips.length === 0 && (
        <Card className="border-yellow-500 bg-yellow-50 text-yellow-800">
          <CardHeader>
            <CardTitle>No Payslips Found</CardTitle>
            <CardDescription>
              It looks like there are no payslips available. Please ensure "Mock Data" is enabled in{" "}
              <a href="/settings/mock-data" className="underline font-semibold">Settings &gt; Mock Data</a>{" "}
              to populate the system with sample payslips.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <PayslipSummaryCharts
        payrollSummaryData={payrollSummaryData}
        deductionsBreakdownData={deductionsBreakdownData}
      />

      {companyDetails && (
        <PayslipGenerationSection
          employees={employees}
          payslips={payslips}
          selectedEmployeeId={selectedEmployeeId}
          setSelectedEmployeeId={setSelectedEmployeeId}
          selectedPayslipId={selectedPayslipId}
          setSelectedPayslipId={setSelectedPayslipId}
          getEmployeeName={getEmployeeName}
          payslipDesignSettings={payslipDesignSettings}
          companyDetails={companyDetails}
          allEmployees={employees}
        />
      )}

      {selectedPayslipForPreview && companyDetails && (
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
              companyDetails={companyDetails}
              employees={employees}
              getEmployeeName={getEmployeeName}
              isPdfGeneration={false}
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

export default PayslipOverviewPage;