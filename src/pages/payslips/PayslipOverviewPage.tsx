"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, ReceiptText, Sparkles } from "lucide-react";

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
import { usePayslipsOverviewSelectors, PayslipsOverviewFilters, FrequencyFilter } from "@/hooks/selectors/usePayslipsOverviewSelectors";
import { Button } from "@/components/ui/button";
import CalculatePaycheckDialog from "@/components/payroll/CalculatePaycheckDialog";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

const PayslipOverviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { employees, payslips, companyDetails, isLoadingCompanyDetails, isLoadingEmployees, isLoadingPayslips } = usePayrollProcessor();
  const { user } = useAuth();
  const { settings: payslipDesignSettings } = usePayslipDesignSettings();
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  // Filters (canonical state lives in page)
  const [filters, setFilters] = useState<PayslipsOverviewFilters>({
    employeeFilterId: "all",
    frequencyFilter: "all",
    dateStart: "",
    dateEnd: "",
    search: "",
  });

  const didInitFromUrl = React.useRef(false);
  useEffect(() => {
    if (didInitFromUrl.current) return;

    const employeeId = searchParams.get("employeeId") || "";
    const frequencyRaw = searchParams.get("frequency") || "";
    const dateStart = searchParams.get("dateStart") || "";
    const dateEnd = searchParams.get("dateEnd") || "";
    const search = searchParams.get("search") || "";

    const frequency: FrequencyFilter = ["all", "Monthly", "Weekly", "Bi-Weekly"].includes(frequencyRaw)
      ? (frequencyRaw as FrequencyFilter)
      : "all";

    setFilters((prev) => ({
      ...prev,
      employeeFilterId: employeeId || prev.employeeFilterId,
      frequencyFilter: frequency,
      dateStart: dateStart || prev.dateStart,
      dateEnd: dateEnd || prev.dateEnd,
      search: search || prev.search,
    }));

    didInitFromUrl.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!didInitFromUrl.current) return;

    const next = new URLSearchParams(searchParams);

    const setOrDelete = (key: string, value: string) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };

    setOrDelete("employeeId", filters.employeeFilterId === "all" ? "" : filters.employeeFilterId);
    setOrDelete("frequency", filters.frequencyFilter === "all" ? "" : filters.frequencyFilter);
    setOrDelete("dateStart", filters.dateStart);
    setOrDelete("dateEnd", filters.dateEnd);
    setOrDelete("search", filters.search.trim());

    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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

  // Keep generation selection aligned with the current employee filter (when not "all")
  useEffect(() => {
    if (filters.employeeFilterId !== "all" && filters.employeeFilterId !== selectedEmployeeId) {
      setSelectedEmployeeId(filters.employeeFilterId);
      setSelectedPayslipId("");
    }
  }, [filters.employeeFilterId, selectedEmployeeId]);

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

  const isAdminOrManager = user?.role === "Admin" || user?.role === "Manager";

  return (
    <div className="space-y-4">
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
        <Card className="rounded-2xl border bg-white p-10 shadow-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="rounded-2xl bg-muted p-3 ring-1 ring-border">
              <ReceiptText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">No payslips yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Once payslips are generated for a pay period, they'll show up here for review, export, and employee self-service.
            </p>

            {isAdminOrManager ? (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setIsPreviewDialogOpen(true)} variant="outline" className="bg-white">
                  <Sparkles className="h-4 w-4" />
                  Preview paycheck
                </Button>
                <Button
                  onClick={() => {
                    const el = document.getElementById("payslip-generator");
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Generate payslips
                </Button>
              </div>
            ) : (
              <div className="mt-6 text-sm text-muted-foreground">
                If you believe you're missing a payslip, please contact your payroll administrator.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Two-column layout: charts on the left (filtered), generator on the right */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(460px,1fr)]">
        <div className="space-y-4">
          <PayslipSummaryCharts
            payrollSummaryData={payrollSummaryData}
            deductionsBreakdownData={deductionsBreakdownData}
          />

          {selectedPayslipForPreview && (
            <Card className="relative overflow-hidden border rounded-2xl bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Payslip preview</CardTitle>
                <CardDescription>
                  {getEmployeeName(selectedPayslipForPreview.employeeId)} • {selectedPayslipForPreview.payPeriod}
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

        <div className="space-y-4">
          {/* Inline admin/manager warning if company details are missing */}
          {!companyDetails && isAdminOrManager && (
            <Card className="border-amber-500 bg-amber-50 text-amber-900">
              <CardHeader className="flex flex-row items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div>
                  <CardTitle className="text-amber-900">Company details required for exports</CardTitle>
                  <CardDescription className="text-amber-800">
                    Set up company details to generate and export payslips.
                    {" "}
                    <a href="/settings/company-details" className="underline font-semibold">Settings → Company Details</a>.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}

          {isAdminOrManager && (
            <Card className="relative overflow-hidden border rounded-2xl bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Preview before you generate</CardTitle>
                <CardDescription>Quickly verify the current period calculation for a single employee.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsPreviewDialogOpen(true)} variant="outline" className="w-full bg-white">
                  <Sparkles className="h-4 w-4" />
                  Preview paycheck
                </Button>
              </CardContent>
            </Card>
          )}

          <Card id="payslip-generator" className="relative overflow-hidden border rounded-2xl bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Generate and export</CardTitle>
              <CardDescription>Select an employee, choose a period, then export PDFs and reports.</CardDescription>
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

      <CalculatePaycheckDialog
        isOpen={isPreviewDialogOpen}
        onClose={() => setIsPreviewDialogOpen(false)}
        payslipDesignSettings={payslipDesignSettings}
      />
    </div>
  );
};

export default PayslipOverviewPage;