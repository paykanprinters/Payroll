"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, ReceiptText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

import PayslipGenerationSection from "@/components/payslips/PayslipGenerationSection";
import PayslipSummaryCharts from "@/components/payslips/PayslipSummaryCharts";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import PayslipsHeader from "@/components/payslips/PayslipsHeader";
import PayslipsOverviewToolbar from "@/components/payslips/overview/PayslipsOverviewToolbar";
import PayslipsSummaryCards from "@/components/payslips/overview/PayslipsSummaryCards";
import PayslipsTable from "@/components/payslips/overview/PayslipsTable";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/use-auth";
import {
  usePayslipsOverviewSelectors,
  PayslipsOverviewFilters,
  FrequencyFilter,
} from "@/hooks/selectors/usePayslipsOverviewSelectors";
import { buildPayslipAdminSummary } from "@/lib/payslip-admin-summary";
import CalculatePaycheckDialog from "@/components/payroll/CalculatePaycheckDialog";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";

const PayslipOverviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    employees,
    payslips,
    companyDetails,
    isLoadingCompanyDetails,
    isLoadingEmployees,
    isLoadingPayslips,
  } = usePayrollProcessor();
  const { user } = useAuth();
  const { settings: payslipDesignSettings } = usePayslipDesignSettings();
  const { downloadPdf } = usePdfVector();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [filters, searchParams, setSearchParams]);

  useEffect(() => {
    if (user?.role === "Staff") {
      const myEmployee = employees.find((emp) => emp.userId === user.id);
      const myId = myEmployee?.id;
      if (myId && filters.employeeFilterId !== myId) {
        setFilters((prev) => ({ ...prev, employeeFilterId: myId }));
        setSelectedEmployeeId(myId);
      }
    }
  }, [user, employees, filters.employeeFilterId]);

  useEffect(() => {
    if (filters.employeeFilterId !== "all" && filters.employeeFilterId !== selectedEmployeeId) {
      setSelectedEmployeeId(filters.employeeFilterId);
      setSelectedPayslipId("");
    }
  }, [filters.employeeFilterId, selectedEmployeeId]);

  const scopedEmployees =
    user?.role === "Staff" ? employees.filter((emp) => emp.userId === user?.id) : employees;

  const {
    filteredPayslips,
    totals,
    payrollSummaryData,
    deductionsBreakdownData,
    getEmployeeName,
  } = usePayslipsOverviewSelectors(payslips, employees, filters);

  const summary = useMemo(
    () => buildPayslipAdminSummary(filteredPayslips),
    [filteredPayslips]
  );

  const filterListVersion = useMemo(
    () =>
      `${filters.employeeFilterId}|${filters.frequencyFilter}|${filters.dateStart}|${filters.dateEnd}|${filters.search}`,
    [filters]
  );

  const getEmployeeCustomId = useCallback(
    (employeeId: string) => {
      const employee = employees.find((emp) => emp.id === employeeId);
      return employee?.customEmployeeId || "N/A";
    },
    [employees]
  );

  useEffect(() => {
    if (filteredPayslips.length === 0) {
      if (selectedPayslipId) setSelectedPayslipId("");
      return;
    }

    const stillVisible = filteredPayslips.some((p) => p.id === selectedPayslipId);
    if (!stillVisible) {
      const first = filteredPayslips[0];
      setSelectedPayslipId(first.id);
      setSelectedEmployeeId(first.employeeId);
    }
  }, [filteredPayslips, selectedPayslipId]);

  const selectedPayslipForPreview =
    filteredPayslips.find((p) => p.id === selectedPayslipId) ||
    payslips.find((p) => p.id === selectedPayslipId);

  const handleSelectPayslip = useCallback((payslip: MockPayslip) => {
    setSelectedPayslipId(payslip.id);
    setSelectedEmployeeId(payslip.employeeId);
    requestAnimationFrame(() => {
      document.getElementById("payslip-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleDownloadPayslip = useCallback(
    async (payslip: MockPayslip) => {
      setIsDownloading(true);
      try {
        const { default: PayslipPdfDocument } = await import(
          "@/components/payslips/PayslipPdfDocument"
        );
        const doc = (
          <PayslipPdfDocument
            payslips={[payslip]}
            employees={employees}
            companyDetails={companyDetails}
            payslipDesignSettings={payslipDesignSettings}
            getEmployeeName={getEmployeeName}
          />
        );
        const filename = `payslip-${getEmployeeCustomId(payslip.employeeId)}-${payslip.payPeriod.replace(/\s+/g, "")}.pdf`;
        await downloadPdf(doc, filename);
      } catch {
        showError("Unable to download payslip. Please try again.");
      } finally {
        setIsDownloading(false);
      }
    },
    [
      employees,
      companyDetails,
      payslipDesignSettings,
      getEmployeeName,
      getEmployeeCustomId,
      downloadPdf,
    ]
  );

  const clearFilters = () => {
    setFilters({
      employeeFilterId: user?.role === "Staff" && scopedEmployees[0] ? scopedEmployees[0].id : "all",
      frequencyFilter: "all",
      dateStart: "",
      dateEnd: "",
      search: "",
    });
  };

  const scrollToGenerate = () => {
    document.getElementById("payslip-generator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isLoadingPage = isLoadingCompanyDetails || isLoadingEmployees || isLoadingPayslips;
  const isAdminOrManager = user?.role === "Admin" || user?.role === "Manager";
  const isStaffView = user?.role === "Staff";

  if (isLoadingPage) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading payslips" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PayslipsHeader
        showAdminActions={isAdminOrManager}
        onPreviewPaycheck={() => setIsPreviewDialogOpen(true)}
        onScrollToGenerate={scrollToGenerate}
        previewDisabled={!employees.length}
      />

      <Alert className="border-slate-200 bg-slate-50">
        <Shield className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">Confidential payroll information</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          Payslips contain personal and financial data. Share PDFs only through approved channels,
          avoid displaying amounts on shared screens, and limit access to authorised payroll staff.
          {isStaffView && " You are viewing records linked to your employee profile only."}
        </AlertDescription>
      </Alert>

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Narrow the register by employee, pay frequency, period dates, or search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayslipsOverviewToolbar
            employees={scopedEmployees}
            employeeFilterId={filters.employeeFilterId}
            onEmployeeFilterChange={(v) => setFilters((prev) => ({ ...prev, employeeFilterId: v }))}
            frequencyFilter={filters.frequencyFilter}
            onFrequencyFilterChange={(v) => setFilters((prev) => ({ ...prev, frequencyFilter: v }))}
            dateStart={filters.dateStart}
            onDateStartChange={(v) => setFilters((prev) => ({ ...prev, dateStart: v }))}
            dateEnd={filters.dateEnd}
            onDateEndChange={(v) => setFilters((prev) => ({ ...prev, dateEnd: v }))}
            search={filters.search}
            onSearchChange={(v) => setFilters((prev) => ({ ...prev, search: v }))}
            onRefresh={() => window.dispatchEvent(new Event("appFocusRefresh"))}
            onClear={clearFilters}
            totals={{ filteredCount: totals.filteredCount, totalCount: totals.totalCount }}
            hideAllOption={isStaffView}
          />
        </CardContent>
      </Card>

      <PayslipsSummaryCards
        gross={summary.gross}
        net={summary.net}
        deductions={summary.deductions}
        count={summary.count}
        uniqueEmployees={summary.uniqueEmployees}
        staffView={isStaffView}
      />

      {payslips.length === 0 && (
        <Card className="rounded-2xl border bg-white p-10 shadow-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="rounded-2xl bg-muted p-3 ring-1 ring-border">
              <ReceiptText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">No payslips yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Generated payslips appear here for secure review and export. Staff receive access through
              the portal once records are published.
            </p>

            {isAdminOrManager ? (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setIsPreviewDialogOpen(true)} variant="outline" className="bg-white">
                  Preview calculation
                </Button>
                <Button onClick={scrollToGenerate}>Generate payslips</Button>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                If you believe a payslip is missing, contact your payroll administrator privately.
              </p>
            )}
          </div>
        </Card>
      )}

      {payslips.length > 0 && (
        <>
          <ErrorBoundary fallbackTitle="Payslip register error">
            <PayslipsTable
              payslips={filteredPayslips}
              getEmployeeName={getEmployeeName}
              getEmployeeCustomId={getEmployeeCustomId}
              selectedPayslipId={selectedPayslipId}
              onSelectPayslip={handleSelectPayslip}
              onDownloadPayslip={handleDownloadPayslip}
              isDownloading={isDownloading}
              listVersion={filterListVersion}
              autoExpandEmployeeId={
                filters.employeeFilterId !== "all" ? filters.employeeFilterId : undefined
              }
            />
          </ErrorBoundary>

          <PayslipSummaryCharts
            payrollSummaryData={payrollSummaryData}
            deductionsBreakdownData={deductionsBreakdownData}
          />

          {selectedPayslipForPreview && (
            <Card id="payslip-preview" className="rounded-2xl border bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Payslip preview</CardTitle>
                <CardDescription>
                  {getEmployeeName(selectedPayslipForPreview.employeeId)} ·{" "}
                  {selectedPayslipForPreview.payPeriod}
                  {" · "}
                  Net {`R ${selectedPayslipForPreview.netPay.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="mx-auto flex min-w-[320px] max-w-3xl justify-center">
                    <IndividualPayslipCard
                      payslip={selectedPayslipForPreview}
                      payslipDesignSettings={payslipDesignSettings}
                      companyDetails={companyDetails}
                      employees={employees}
                      getEmployeeName={getEmployeeName}
                      isPdfGeneration={false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isAdminOrManager && (
        <>
          {!companyDetails && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-950">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Company details required</AlertTitle>
              <AlertDescription>
                Complete company details before generating or exporting payslips.{" "}
                <a href="/settings/company-details" className="font-medium underline">
                  Settings → Company Details
                </a>
              </AlertDescription>
            </Alert>
          )}

          <Card id="payslip-generator" className="rounded-2xl border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Generate and export</CardTitle>
              <CardDescription>
                Run payroll for a period, then download individual or bulk PDF packages for authorised
                distribution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayslipGenerationSection
                employees={scopedEmployees}
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
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Payroll workflow</p>
          <p className="mt-2">
            Confirm timesheets and leave are approved, then <strong>Preview calculation</strong> for a
            single employee before running bulk generation. Use the register to verify net pay, download
            PDFs only when needed, and export annual tax certificates via{" "}
            <strong>IRP5 export</strong> when tax reporting is due. KPI cards and charts reflect the
            filtered register above.
          </p>
        </CardContent>
      </Card>

      <CalculatePaycheckDialog
        isOpen={isPreviewDialogOpen}
        onClose={() => setIsPreviewDialogOpen(false)}
        payslipDesignSettings={payslipDesignSettings}
      />
    </div>
  );
};

export default PayslipOverviewPage;
