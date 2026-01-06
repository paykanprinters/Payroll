"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, Wallet, ReceiptText } from "lucide-react";

import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import PayslipsHeader from "@/components/payslips/PayslipsHeader";

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
    if (payslips.length > 0) {
      const totalGross = payslips.reduce((sum, p) => sum + p.grossEarnings, 0);
      const totalNet = payslips.reduce((sum, p) => sum + p.netPay, 0);
      setPayrollSummaryData([{ name: "Total Payroll", gross: totalGross, net: totalNet }]);

      const deductionsMap = new Map<string, number>();
      payslips.forEach(payslip => {
        payslip.deductionsBreakdown.forEach(deduction => {
          const label = cleanLabel(deduction.name);
          deductionsMap.set(label, (deductionsMap.get(label) || 0) + deduction.amount);
        });
      });
      setDeductionsBreakdownData(
        Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }))
      );
    } else {
      setPayrollSummaryData([]);
      setDeductionsBreakdownData([]);
    }
  }, [payslips, employees]);

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

  useEffect(() => {
    if (!selectedEmployeeId || payslips.length === 0) {
      if (selectedPayslipId) setSelectedPayslipId("");
      return;
    }
    const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
    if (filteredPayslipsForEmployee.length === 0) {
      if (selectedPayslipId) setSelectedPayslipId("");
      return;
    }
    if (!selectedPayslipId) {
      const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecentPayslip) setSelectedPayslipId(mostRecentPayslip.id);
    }
  }, [selectedEmployeeId, payslips, selectedPayslipId, setSelectedPayslipId]);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const selectedPayslipForPreview = payslips.find(p => p.id === selectedPayslipId);
  const isLoadingPage = isLoadingCompanyDetails || isLoadingEmployees || isLoadingPayslips;

  const totals = useMemo(() => {
    const gross = payslips.reduce((sum, p) => sum + p.grossEarnings, 0);
    const net = payslips.reduce((sum, p) => sum + p.netPay, 0);
    const count = payslips.length;
    return { gross, net, count };
  }, [payslips]);

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
      <PayslipsHeader />

      {/* Soft-accent stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <DollarSign className="h-4 w-4" />
              </span>
              Total Gross Payroll
            </CardTitle>
            <CardDescription className="text-xs">Sum of gross earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {totals.gross.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="emerald" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </span>
              Total Net Payroll
            </CardTitle>
            <CardDescription className="text-xs">Sum of net pay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {totals.net.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="orange" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
                <ReceiptText className="h-4 w-4" />
              </span>
              Payslips Generated
            </CardTitle>
            <CardDescription className="text-xs">Total available payslips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
      </div>

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

      {/* Two-column layout: charts on the left, generator on the right */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PayslipSummaryCharts
            payrollSummaryData={payrollSummaryData}
            deductionsBreakdownData={deductionsBreakdownData}
          />

          {selectedPayslipForPreview && (
            <Card className="relative overflow-hidden border rounded-xl bg-white">
              <SummaryAccent variant="sky" />
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
        </div>

        <div className="space-y-4 lg:col-span-1">
          <Card className="relative overflow-hidden border rounded-xl bg-white">
            <SummaryAccent variant="emerald" />
            <CardHeader>
              <CardTitle>Generate / Select Payslip</CardTitle>
              <CardDescription>Choose an employee and manage payslip periods.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>

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