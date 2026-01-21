"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";

import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import PayslipsHeader from "@/components/payslips/PayslipsHeader";
import PayslipsOverviewToolbar from "@/components/payslips/overview/PayslipsOverviewToolbar";
import { useAuth } from "@/context/AuthContext";
import PayslipsSummaryCards from "@/components/payslips/overview/PayslipsSummaryCards";
import { usePayslipsOverviewSelectors, PayslipsOverviewFilters } from "@/hooks/selectors/usePayslipsOverviewSelectors";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

const PayslipOverviewPage: React.FC = () => {
  const { employees, payslips, companyDetails, isLoadingCompanyDetails, isLoadingEmployees, isLoadingPayslips } = usePayrollProcessor();
  const { user } = useAuth();
  const { settings: payslipDesignSettings } = usePayslipDesignSettings();
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");

  // Filters (canonical state lives in page)
  const [filters, setFilters] = useState<PayslipsOverviewFilters>({
    employeeFilterId: "all",
    frequencyFilter: "all",
    dateStart: "",
    dateEnd: "",
    search: "",
  });

  // Staff scoping: default to the staff's own employee and restrict selection
  useEffect(() => {
    if (user?.role === "Staff") {
      const myEmployee = employees.find(emp => (emp as any).userId === user.id);
      const myId = myEmployee?.id;
      if (myId && filters.employeeFilterId !== myId) {
        setFilters(prev => ({ ...prev, employeeFilterId: myId }));
        setSelectedEmployeeId(myId);
      }
    }
  }, [user, employees]); // intentionally not including filters to avoid loops

  const {
    filteredPayslips,
    totals,
    payrollSummaryData,
    deductionsBreakdownData,
    getEmployeeName,
  } = usePayslipsOverviewSelectors(payslips, employees, filters);

  const loadReportDesignSettings = useCallback(() => {
    const saved = localStorage.getItem("reportDesignSettings");
    if (saved) {
      setReportDesignSettings(JSON.parse(saved));
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  }, []);

  useEffect(() => {
    loadReportDesignSettings();
    const handler = () => loadReportDesignSettings();
    window.addEventListener('reportDesignUpdated', handler);
    return () => window.removeEventListener('reportDesignUpdated', handler);
  }, [loadReportDesignSettings]);

  // Keep existing selection auto-pick logic
  useEffect(() => {
    if (!selectedEmployeeId || payslips.length === 0) {
      if (selectedPayslipId) setSelectedPayslipId("");
      return;
    }
    const forEmp = payslips.filter(p => p.employeeId === selectedEmployeeId);
    if (forEmp.length === 0) {
      if (selectedPayslipId) setSelectedPayslipId("");
      return;
    }
    if (!selectedPayslipId) {
      const mostRecent = [...forEmp].sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecent) setSelectedPayslipId(mostRecent.id);
    }
  }, [selectedEmployeeId, payslips, selectedPayslipId]);

  const selectedPayslipForPreview = payslips.find(p => p.id === selectedPayslipId);
  const isLoadingPage = isLoadingCompanyDetails || isLoadingEmployees || isLoadingPayslips;

  if (isLoadingPage) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading payroll data...</span>
      </div>
    );
  }

  // Do not block the page if company details are missing.
  // Staff should be able to view their own payslips; Admin/Manager will see a soft warning near generation actions.

  return (
    <div className="flex flex-col gap-4">
      <PayslipsHeader />

      {/* Toolbar: Filters, Date range, Search (debounced), Refresh */}
      <Card className="border rounded-xl">
        <PayslipsOverviewToolbar
          employees={user?.role === "Staff" ? employees.filter(emp => (emp as any).userId === user?.id) : employees}
          employeeFilterId={filters.employeeFilterId}
          onEmployeeFilterChange={(v) => setFilters(prev => ({ ...prev, employeeFilterId: v }))}

          frequencyFilter={filters.frequencyFilter}
          onFrequencyFilterChange={(v) => setFilters(prev => ({ ...prev, frequencyFilter: v }))}

          dateStart={filters.dateStart}
          onDateStartChange={(v) => setFilters(prev => ({ ...prev, dateStart: v }))}

          dateEnd={filters.dateEnd}
          onDateEndChange={(v) => setFilters(prev => ({ ...prev, dateEnd: v }))}

          search={filters.search}
          onSearchChange={(v) => setFilters(prev => ({ ...prev, search: v }))}

          onRefresh={() => window.dispatchEvent(new Event("appFocusRefresh"))}
          totals={{ filteredCount: totals.filteredCount, totalCount: totals.totalCount }}
          hideAllOption={user?.role === "Staff"}
          disabled={false}
        />
      </Card>

      {/* Soft-accent stat cards (filtered) */}
      <PayslipsSummaryCards gross={totals.gross} net={totals.net} count={totals.count} />

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

      {/* Two-column layout: charts on the left (filtered), generator on the right */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PayslipSummaryCharts
            payrollSummaryData={payrollSummaryData}
            deductionsBreakdownData={deductionsBreakdownData}
          />

          {selectedPayslipForPreview && (
            <Card className="relative overflow-hidden border rounded-xl bg-white">
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
          {/* Inline admin/manager warning if company details are missing */}
          {!companyDetails && (user?.role === "Admin" || user?.role === "Manager") && (
            <Card className="border-amber-500 bg-amber-50 text-amber-900">
              <CardHeader className="flex flex-row items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <CardTitle className="text-amber-900">Company Details Missing</CardTitle>
                  <CardDescription className="text-amber-800">
                    Company details are required for generating and exporting payslips. Please set them up in{" "}
                    <a href="/settings/company-details" className="underline font-semibold">Settings &gt; Company Details</a>.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}

          <Card className="relative overflow-hidden border rounded-xl bg-white">
            <CardHeader>
              <CardTitle>Generate / Select Payslip</CardTitle>
              <CardDescription>Choose an employee and manage payslip periods.</CardDescription>
            </CardHeader>
            <CardContent>
              <PayslipGenerationSection
                employees={user?.role === "Staff" ? employees.filter(emp => (emp as any).userId === user?.id) : employees}
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
          Use the filters above to explore payslips by employee, date range, or pay frequency. Charts and totals update to reflect your current filters.
        </p>
      </div>
    </div>
  );
};

export default PayslipOverviewPage;