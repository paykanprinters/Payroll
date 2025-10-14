"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import new modular components
import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard"; // Import IndividualPayslipCard directly
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces"; // Import MockCompanyDetails
import { ReportDesignSettings } from "@/lib/report-design-interfaces"; // Import ReportDesignSettings
import { showError } from "@/utils/toast"; // Import showError
import { usePayrollProcessor } from "@/hooks/use-payroll-processor"; // Import usePayrollProcessor

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
  const { employees, payslips, companyDetails } = usePayrollProcessor(); // Get companyDetails
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
    // This function now relies on the 'payslips' and 'employees' states from usePayrollProcessor
    // which are updated by the 'mockDataUpdated' event.
    if (payslips.length > 0) {
      const totalGross = payslips.reduce((sum, p) => sum + p.grossEarnings, 0);
      const totalNet = payslips.reduce((sum, p) => sum + p.netPay, 0);
      setPayrollSummaryData([
        { name: "Total Payroll", gross: totalGross, net: totalNet },
      ]);

      const deductionsMap = new Map<string, number>();
      payslips.forEach(payslip => {
        payslip.deductionsBreakdown.forEach(deduction => {
          deductionsMap.set(deduction.name, (deductionsMap.get(deduction.name) || 0) + deduction.amount);
        });
      });
      setDeductionsBreakdownData(
        Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }))
      );

    } else {
      setPayrollSummaryData([]);
      setDeductionsBreakdownData([]);
    }
  }, [payslips, employees]); // Depend on payslips and employees from usePayrollProcessor

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
    loadPayslipDesignSettings();
    loadReportDesignSettings();

    const handleMockDataUpdate = () => {
      loadPayslipsAndEmployees();
    };
    const handlePayslipDesignUpdate = () => {
      loadPayslipDesignSettings();
    };
    const handleReportDesignUpdate = () => {
      loadReportDesignSettings();
    };

    window.addEventListener('mockDataUpdated', handleMockDataUpdate);
    window.addEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
    window.addEventListener('reportDesignUpdated', handleReportDesignUpdate);

    return () => {
      window.removeEventListener('mockDataUpdated', handleMockDataUpdate);
      window.removeEventListener('payslipDesignUpdated', handlePayslipDesignUpdate);
      window.removeEventListener('reportDesignUpdated', handleReportDesignUpdate);
    };
  }, [loadPayslipsAndEmployees, loadPayslipDesignSettings, loadReportDesignSettings]);

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