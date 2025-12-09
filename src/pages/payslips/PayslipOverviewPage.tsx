"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Import new modular components
import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";

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
  irp5ContentFontSize: 12,
};

const PayslipOverviewPage: React.FC = () => {
  const { employees, payslips, companyDetails, isLoadingCompanyDetails, isLoadingEmployees, isLoadingPayslips } = usePayrollProcessor();
  const { settings: payslipDesignSettings } = usePayslipDesignSettings();
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);
  const [payrollSummaryData, setPayrollSummaryData] = useState<{ name: string; gross: number; net: number }[]>([]);
  const [deductionsBreakdownData, setDeductionsBreakdownData] = useState<{ name: string; value: number }[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");

  const cleanLabel = (label: string) =>
    label.replace(/\s*\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)\s*$/i, "");

  const loadPayslipsAndEmployees = useCallback(() => {
    const list = Array.isArray(payslips) ? payslips : [];

    if (list.length > 0) {
      const totalGross = list.reduce((sum, p) => sum + Number(p?.grossEarnings ?? 0), 0);
      const totalNet = list.reduce((sum, p) => sum + Number(p?.netPay ?? 0), 0);
      setPayrollSummaryData([{ name: "Total Payroll", gross: totalGross, net: totalNet }]);

      const deductionsMap = new Map<string, number>();
      list.forEach((payslip) => {
        const items = Array.isArray(payslip?.deductionsBreakdown) ? payslip.deductionsBreakdown : [];
        items.forEach((deduction) => {
          const name = typeof deduction?.name === "string" ? deduction.name : "Other";
          const label = cleanLabel(name);
          const amount = Number(deduction?.amount ?? 0);
          deductionsMap.set(label, (deductionsMap.get(label) || 0) + (isFinite(amount) ? amount : 0));
        });
      });

      setDeductionsBreakdownData(
        Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }))
      );
    } else {
      setPayrollSummaryData([]);
      setDeductionsBreakdownData([]);
    }
  }, [payslips]);

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
    loadReportDesignSettings();

    const handleMockDataUpdate = () => {
      loadPayslipsAndEmployees();
    };
    const handleReportDesignUpdate = () => {
      loadReportDesignSettings();
    };

    window.addEventListener('allMockDataUpdated', handleMockDataUpdate);
    window.addEventListener('payslipsUpdated', handleMockDataUpdate);
    window.addEventListener('employeesUpdated', handleMockDataUpdate);
    window.addEventListener('reportDesignUpdated', handleReportDesignUpdate);

    return () => {
      window.removeEventListener('allMockDataUpdated', handleMockDataUpdate);
      window.removeEventListener('payslipsUpdated', handleMockDataUpdate);
      window.removeEventListener('employeesUpdated', handleMockDataUpdate);
      window.removeEventListener('reportDesignUpdated', handleReportDesignUpdate);
    };
  }, [loadPayslipsAndEmployees, loadReportDesignSettings]);

  React.useEffect(() => {
    const list = Array.isArray(payslips) ? payslips : [];
    console.log("PayslipOverviewPage useEffect: Running...");
    console.log("  selectedEmployeeId:", selectedEmployeeId);
    console.log("  selectedPayslipId (before logic):", selectedPayslipId);
    console.log("  payslips.length:", list.length);

    if (!selectedEmployeeId || list.length === 0) {
      if (selectedPayslipId) {
        console.log("  No employee or no payslips, clearing selectedPayslipId.");
        setSelectedPayslipId("");
      }
      return;
    }

    const filteredPayslipsForEmployee = list.filter((p) => p.employeeId === selectedEmployeeId);
    console.log("  filteredPayslipsForEmployee.length:", filteredPayslipsForEmployee.length);

    if (filteredPayslipsForEmployee.length === 0) {
      if (selectedPayslipId) {
        console.log("  No payslips for selected employee, clearing selectedPayslipId.");
        setSelectedPayslipId("");
      }
      return;
    }

    if (!selectedPayslipId) {
      console.log("  No payslip currently selected. Attempting to set to most recent as default.");
      const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecentPayslip) {
        console.log("  Setting selectedPayslipId to most recent:", mostRecentPayslip.id);
        setSelectedPayslipId(mostRecentPayslip.id);
      } else {
        console.log("  No most recent payslip found, clearing selectedPayslipId.");
        setSelectedPayslipId("");
      }
    } else {
      console.log("  A payslip is already selected. Not automatically changing user's selection.");
    }
    console.log("PayslipOverviewPage useEffect: Finished. selectedPayslipId (after logic):", selectedPayslipId);
  }, [selectedEmployeeId, payslips, selectedPayslipId, setSelectedPayslipId]);

  const getEmployeeName = (employeeId: string) => {
    const employee = (employees ?? []).find((emp) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
    };

  const selectedPayslipForPreview = (Array.isArray(payslips) ? payslips : []).find((p) => p.id === selectedPayslipId);

  const isLoadingPage = isLoadingCompanyDetails || isLoadingEmployees || isLoadingPayslips;

  if (isLoadingPage) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading payroll data...</span>
      </div>
    );
  }

  if (!companyDetails) {
    return (
      <Card className="border-red-500 bg-red-50 text-red-800">
        <CardHeader>
          <CardTitle>Company Details Missing</CardTitle>
          <CardDescription>
            Company details are required to generate payslips. Please set them up in{" "}
            <a href="/settings/company-details" className="underline font-semibold">Settings &gt; Company Details</a>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payslip Overview</h1>
      <p className="text-lg text-muted-foreground">
        Generate new payslips, view historical payslips, and manage payroll periods.
      </p>

      {(Array.isArray(payslips) ? payslips : []).length === 0 && (
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

      {selectedPayslipForPreview && (
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