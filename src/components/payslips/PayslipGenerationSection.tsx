"use client";

import React, { useCallback } from "react";
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { format, isSameMonth, isSameYear, startOfMonth, endOfMonth } from "date-fns";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import EmployeePayslipSelector from "./EmployeePayslipSelector";
import BulkPayslipActions from "./BulkPayslipActions";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { saveGeneratedReport, computeChecksum } from "@/integrations/supabase/generated-reports";
import { generatePayrollSummaryReportContent, generateEmployeePayslipReportContent } from "@/lib/report-generators";
import { showError, showSuccess } from "@/utils/toast";
import { pdf as pdfRenderer } from "@react-pdf/renderer";

// Vector PDF helpers
import { usePdfVector } from "@/hooks/use-pdf-vector";
import PayslipPdfDocument from "./PayslipPdfDocument";
import ReportPdfDocument from "@/components/reports/ReportPdfDocument";
import { useZipDownload } from "@/hooks/use-zip-download";

// Modular panels
import IndividualActionsPanel from "./IndividualActionsPanel";
import GenerationButtonsPanel from "./GenerationButtonsPanel";

interface PayslipGenerationSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  getEmployeeName: (employeeId: string) => string;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails | null;
  allEmployees: MockEmployee[];
}

const PayslipGenerationSection: React.FC<PayslipGenerationSectionProps> = ({
  employees,
  payslips,
  selectedEmployeeId,
  setSelectedEmployeeId,
  selectedPayslipId,
  setSelectedPayslipId,
  getEmployeeName,
  payslipDesignSettings,
  companyDetails,
  allEmployees,
}) => {
  const [selectedPayPeriodDate, setSelectedPayPeriodDate] = React.useState<Date | undefined>(new Date());
  const [bulkGenerationMode, setBulkGenerationMode] = React.useState<"monthly" | "weekly">("monthly");
  const [auditLevel, setAuditLevel] = React.useState<"minimal" | "standard" | "detailed">("standard");

  const { payCycleSettings, runPayrollProcess, refetchPayslips } = usePayrollProcessor();
  const { downloadPdf, openPdf } = usePdfVector();
  const { downloadZip } = useZipDownload();

  const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
    defaultReportPaperSize: "A4",
    includeCompanyLogo: true,
    includeCompanyDetails: true,
    reportContentFontSize: 14,
    irp5ContentFontSize: 12,
  };

  const loadReportDesignSettings = React.useCallback((): ReportDesignSettings => {
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      return JSON.parse(savedReportDesignSettings) as ReportDesignSettings;
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      return DEFAULT_REPORT_DESIGN_SETTINGS;
    }
  }, []);

  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);

  React.useEffect(() => {
    if (selectedEmployeeId && filteredPayslipsForEmployee.length > 0) {
      if (!selectedPayslipId) {
        const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
        if (mostRecentPayslip) {
          setSelectedPayslipId(mostRecentPayslip.id);
        }
      }
    } else if (!selectedEmployeeId && selectedPayslipId) {
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, filteredPayslipsForEmployee, selectedPayslipId, setSelectedPayslipId]);

  const handlePrintOrDownloadIndividual = useCallback(async (action: 'print' | 'download') => {
    if (!selectedPayslip || !companyDetails) {
      showError(`Please select a payslip and ensure company details are loaded to ${action}.`);
      return;
    }

    const doc = (
      <PayslipPdfDocument
        payslips={[selectedPayslip]}
        employees={allEmployees}
        companyDetails={companyDetails}
        payslipDesignSettings={payslipDesignSettings}
        getEmployeeName={getEmployeeName}
      />
    );

    const filename = `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`;
    if (action === 'download') {
      await downloadPdf(doc, filename);
    } else {
      await openPdf(doc, filename);
    }
  }, [selectedPayslip, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, downloadPdf, openPdf]);

  const handleGenerateSelectedPeriodPayslips = React.useCallback(async () => {
    if (!selectedPayPeriodDate) {
      showError("Please select a pay period date first.");
      return;
    }

    const cutOffDay = payCycleSettings?.cutOffDay ?? 2; // Default Tuesday
    const payDayOffset = payCycleSettings?.payDayOffset ?? 0;

    let periodStart: Date;
    let periodEnd: Date;

    if (bulkGenerationMode === "weekly") {
      const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
        selectedPayPeriodDate,
        "Weekly",
        cutOffDay,
        payDayOffset
      );
      periodStart = payPeriodStart;
      periodEnd = payPeriodEnd;
    } else {
      periodStart = startOfMonth(selectedPayPeriodDate);
      periodEnd = endOfMonth(selectedPayPeriodDate);
    }

    await runPayrollProcess(periodStart, periodEnd);
    refetchPayslips?.();
  }, [selectedPayPeriodDate, bulkGenerationMode, payCycleSettings, runPayrollProcess, refetchPayslips]);

  const handlePrintOrDownloadAll = React.useCallback(async (action: 'print' | 'download', mode: "monthly" | "weekly", level: "minimal" | "standard" | "detailed") => {
    if (!selectedPayPeriodDate || !companyDetails) {
      showError("Please select a pay period date and ensure company details are loaded to generate all payslips.");
      return;
    }

    const settings = payCycleSettings ? {
      payCycleType: payCycleSettings.payCycleType,
      cutOffDay: payCycleSettings.cutOffDay,
      payDayOffset: payCycleSettings.payDayOffset,
    } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };

    const payslipsForPeriod = payslips.filter(p => {
      const employee = allEmployees.find(emp => emp.id === p.employeeId);
      if (!employee) return false;

      const [startPeriodStr] = p.payPeriod.split(' - ');
      if (mode === "monthly" && employee.payFrequency === "Monthly") {
        const payslipStartDate = new Date(startPeriodStr);
        return isSameMonth(payslipStartDate, selectedPayPeriodDate) && isSameYear(payslipStartDate, selectedPayPeriodDate);
      } else if (mode === "weekly" && (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly")) {
        const { payPeriodStart } = calculatePayPeriodDetails(
          selectedPayPeriodDate,
          employee.payFrequency === "Bi-Weekly" ? "Bi-Weekly" : "Weekly",
          settings.cutOffDay,
          settings.payDayOffset
        );
        return startPeriodStr === format(payPeriodStart, "yyyy-MM-dd");
      }
      return false;
    });

    if (payslipsForPeriod.length === 0) {
      showError(`No ${mode} payslips found for the selected period (${format(selectedPayPeriodDate, mode === "monthly" ? 'MMM yyyy' : 'PPP')}).`);
      return;
    }

    const reportDesignSettings = loadReportDesignSettings();

    if (level === "detailed") {
      const nonCashEmployees = allEmployees.filter(e => e.paymentMode !== "Cash");
      const nonCashIds = new Set(nonCashEmployees.map(e => e.id));
      const payslipsForReports = payslipsForPeriod.filter(p => nonCashIds.has(p.employeeId));

      const payrollSummaryHtml = generatePayrollSummaryReportContent(payslipsForReports, nonCashEmployees, selectedPayPeriodDate, mode, level);
      const employeePayslipHtml = generateEmployeePayslipReportContent(payslipsForReports, nonCashEmployees, selectedPayPeriodDate, mode, level);
      const combinedHtml = `
        <h3>Payroll Summary Report</h3>
        ${payrollSummaryHtml}
        <hr/>
        <h3>Employee Payslip Report</h3>
        ${employeePayslipHtml}
        <p style="margin-top:8px;font-size:12px;color:#666;">Audit Level: ${level} • Cash employees excluded • Generated: ${new Date().toLocaleString()}</p>
        <p style="font-size:12px;color:#666;">Checksum: ${computeChecksum(payrollSummaryHtml + employeePayslipHtml)}</p>
      `;
      await saveGeneratedReport(`Bulk Payslips Reports — ${mode} — ${format(selectedPayPeriodDate, mode === "monthly" ? 'MMM yyyy' : 'PPP')}`, combinedHtml);
    }

    const reportsDoc = (
      <ReportPdfDocument
        payslips={payslips}
        employees={allEmployees}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        auditLevel={level}
        selectedDate={selectedPayPeriodDate}
        mode={mode}
      />
    );
    const payslipsDoc = (
      <PayslipPdfDocument
        payslips={payslipsForPeriod}
        employees={allEmployees}
        companyDetails={companyDetails}
        payslipDesignSettings={payslipDesignSettings}
        getEmployeeName={getEmployeeName}
      />
    );

    const reportsFilename = `reports-${mode}-${format(selectedPayPeriodDate, mode === "monthly" ? 'yyyy-MM' : 'yyyy-MM-dd')}.pdf`;
    const payslipsFilename = `payslips-${mode}-${format(selectedPayPeriodDate, mode === "monthly" ? 'yyyy-MM' : 'yyyy-MM-dd')}.pdf`;

    try {
      if (action === 'download') {
        const [reportsBlob, payslipsBlob] = await Promise.all([
          pdfRenderer(reportsDoc).toBlob(),
          pdfRenderer(payslipsDoc).toBlob(),
        ]);

        await downloadZip(
          [
            { filename: reportsFilename, blob: reportsBlob },
            { filename: payslipsFilename, blob: payslipsBlob },
          ],
          `bulk-exports-${mode}-${format(selectedPayPeriodDate, mode === "monthly" ? 'yyyy-MM' : 'yyyy-MM-dd')}.zip`
        );
        showSuccess(`Reports and payslips downloaded together as a ZIP (separate PDFs inside).`);
      } else {
        await openPdf(reportsDoc, reportsFilename);
        await openPdf(payslipsDoc, payslipsFilename);
        showSuccess(`Reports and payslips opened in new tabs.`);
      }
    } catch (e: any) {
      showError(`Bulk ${action} failed: ${e?.message || 'Unknown error'}`);
    }
  }, [selectedPayPeriodDate, payslips, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, loadReportDesignSettings, payCycleSettings, downloadZip, openPdf]);

  const handleGenerateAllCurrentPeriodPayslips = React.useCallback(async (action: 'print' | 'download') => {
    if (!companyDetails) {
      showError("Company details are not loaded. Cannot generate all payslips for current period.");
      return;
    }

    const today = new Date();
    const payslipsForCurrentPeriod: MockPayslip[] = [];

    const settings = payCycleSettings ? {
      payCycleType: payCycleSettings.payCycleType,
      cutOffDay: payCycleSettings.cutOffDay,
      payDayOffset: payCycleSettings.payDayOffset,
    } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };

    allEmployees.forEach(employee => {
      let periodStart: Date;
      let periodEnd: Date;
      const periodFormat = "yyyy-MM-dd";

      if (employee.payFrequency === "Monthly") {
        periodStart = startOfMonth(today);
        periodEnd = endOfMonth(today);
      } else if (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly") {
        const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
          today,
          employee.payFrequency === "Bi-Weekly" ? "Bi-Weekly" : "Weekly",
          settings.cutOffDay,
          settings.payDayOffset
        );
        periodStart = payPeriodStart;
        periodEnd = payPeriodEnd;
      } else {
        return;
      }

      const targetPayPeriodString = `${format(periodStart, periodFormat)} - ${format(periodEnd, periodFormat)}`;
      const foundPayslip = payslips.find(p =>
        p.employeeId === employee.id && p.payPeriod === targetPayPeriodString
      );
      if (foundPayslip) {
        payslipsForCurrentPeriod.push(foundPayslip);
      }
    });

    if (payslipsForCurrentPeriod.length === 0) {
      showError("No payslips found for the current period for any employee. Ensure mock data is up-to-date.");
      return;
    }

    const reportDesignSettings = loadReportDesignSettings();

    if (auditLevel === "detailed") {
      const nonCashEmployees = allEmployees.filter(e => e.paymentMode !== "Cash");
      const nonCashIds = new Set(nonCashEmployees.map(e => e.id));
      const payslipsForReports = payslipsForCurrentPeriod.filter(p => nonCashIds.has(p.employeeId));

      const mode: "monthly" | "weekly" = "monthly";
      const payrollSummaryHtml = generatePayrollSummaryReportContent(payslipsForReports, nonCashEmployees, today, mode, auditLevel);
      const employeePayslipHtml = generateEmployeePayslipReportContent(payslipsForReports, nonCashEmployees, today, mode, auditLevel);
      const combinedHtml = `
        <h3>Payroll Summary Report</h3>
        ${payrollSummaryHtml}
        <hr/>
        <h3>Employee Payslip Report</h3>
        ${employeePayslipHtml}
        <p style="margin-top:8px;font-size:12px;color:#666;">Audit Level: ${auditLevel} • Cash employees excluded • Generated: ${new Date().toLocaleString()}</p>
        <p style="font-size:12px;color:#666;">Checksum: ${computeChecksum(payrollSummaryHtml + employeePayslipHtml)}</p>
      `;
      await saveGeneratedReport(`Bulk Payslips Reports — Current Period — ${format(today, 'yyyy-MM-dd')}`, combinedHtml);
    }

    const reportsDoc = (
      <ReportPdfDocument
        payslips={payslips}
        employees={allEmployees}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        auditLevel={auditLevel}
        selectedDate={today}
        mode={"monthly"}
      />
    );
    const payslipsDoc = (
      <PayslipPdfDocument
        payslips={payslipsForCurrentPeriod}
        employees={allEmployees}
        companyDetails={companyDetails}
        payslipDesignSettings={payslipDesignSettings}
        getEmployeeName={getEmployeeName}
      />
    );

    const reportsFilename = `reports-current-period-${format(today, 'yyyy-MM-dd')}.pdf`;
    const payslipsFilename = `payslips-current-period-${format(today, 'yyyy-MM-dd')}.pdf`;

    try {
      if (action === 'download') {
        const [reportsBlob, payslipsBlob] = await Promise.all([
          pdfRenderer(reportsDoc).toBlob(),
          pdfRenderer(payslipsDoc).toBlob(),
        ]);

        await downloadZip(
          [
            { filename: reportsFilename, blob: reportsBlob },
            { filename: payslipsFilename, blob: payslipsBlob },
          ],
          `bulk-exports-current-period-${format(today, 'yyyy-MM-dd')}.zip`
        );
        showSuccess(`Reports and payslips downloaded together as a ZIP (separate PDFs inside).`);
      } else {
        await openPdf(reportsDoc, reportsFilename);
        await openPdf(payslipsDoc, payslipsFilename);
        showSuccess(`Reports and payslips opened in new tabs for current period.`);
      }
    } catch (e: any) {
      showError(`Bulk ${action} failed: ${e?.message || 'Unknown error'}`);
    }
  }, [allEmployees, payslips, payslipDesignSettings, companyDetails, getEmployeeName, auditLevel, loadReportDesignSettings, payCycleSettings, downloadZip, openPdf]);

  const handleSelectCurrentPeriodPayslip = useCallback(() => {
    if (!selectedEmployeeId) {
      showError("Please select an employee first.");
      return;
    }

    const employee = allEmployees.find(emp => emp.id === selectedEmployeeId);
    if (!employee) {
      showError("Selected employee not found.");
      return;
    }

    const today = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    const periodFormat = "yyyy-MM-dd";

    if (employee.payFrequency === "Monthly") {
      periodStart = startOfMonth(today);
      periodEnd = endOfMonth(today);
    } else if (employee.payFrequency === "Weekly" || employee.payFrequency === "Bi-Weekly") {
      const settings = payCycleSettings ? {
        payCycleType: payCycleSettings.payCycleType,
        cutOffDay: payCycleSettings.cutOffDay,
        payDayOffset: payCycleSettings.payDayOffset,
      } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };

      const { payPeriodStart, payPeriodEnd } = calculatePayPeriodDetails(
        today,
        employee.payFrequency === "Bi-Weekly" ? "Bi-Weekly" : "Weekly",
        settings.cutOffDay,
        settings.payDayOffset
      );
      periodStart = payPeriodStart;
      periodEnd = payPeriodEnd;
    } else {
      showError(`Employee ${employee.firstName} ${employee.lastName} has an unsupported pay frequency: ${employee.payFrequency}.`);
      return;
    }

    const targetPayPeriodString = `${format(periodStart, periodFormat)} - ${format(periodEnd, periodFormat)}`;

    const foundPayslip = payslips.find(p =>
      p.employeeId === selectedEmployeeId && p.payPeriod === targetPayPeriodString
    );

    if (foundPayslip) {
      setSelectedPayslipId(foundPayslip.id);
      showSuccess(`Payslip for ${employee.firstName} ${employee.lastName} for the current period (${foundPayslip.payPeriod}) selected.`);
    } else {
      showError(`No payslip found for ${employee.firstName} ${employee.lastName} for the current period (${targetPayPeriodString}).`);
    }
  }, [selectedEmployeeId, allEmployees, payslips, setSelectedPayslipId, payCycleSettings]);

  return (
    <div className="space-y-6">
      {/* Row 1: Employee & payslip selection + actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
        {/* Left: selectors */}
        <div className="md:col-span-1 lg:col-span-2 grid gap-3 sm:grid-cols-2">
          <EmployeePayslipSelector
            employees={employees}
            payslips={payslips}
            selectedEmployeeId={selectedEmployeeId}
            setSelectedEmployeeId={setSelectedEmployeeId}
            selectedPayslipId={selectedPayslipId}
            setSelectedPayslipId={setSelectedPayslipId}
            filteredPayslipsForEmployee={filteredPayslipsForEmployee}
          />
        </div>

        {/* Right: individual actions panel */}
        <div className="md:col-span-1 lg:col-span-1">
          <IndividualActionsPanel
            selectedPayslip={selectedPayslip}
            selectedEmployeeId={selectedEmployeeId}
            onSelectCurrentPeriodPayslip={handleSelectCurrentPeriodPayslip}
            onPrint={() => handlePrintOrDownloadIndividual('print')}
            onDownload={() => handlePrintOrDownloadIndividual('download')}
          />
        </div>
      </div>

      <div className="border-t" />

      {/* Row 2: Bulk actions + generation buttons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
        {/* Left: bulk controls */}
        <div className="md:col-span-1 lg:col-span-2 grid gap-3 sm:grid-cols-3">
          <BulkPayslipActions
            payslips={payslips}
            selectedPayPeriodDate={selectedPayPeriodDate}
            setSelectedPayPeriodDate={setSelectedPayPeriodDate}
            bulkGenerationMode={bulkGenerationMode}
            setBulkGenerationMode={setBulkGenerationMode}
            onPrintAll={handlePrintOrDownloadAll}
            onDownloadAll={handlePrintOrDownloadAll}
            auditLevel={auditLevel}
            setAuditLevel={setAuditLevel}
          />
        </div>

        {/* Right: generation buttons panel */}
        <div className="md:col-span-1 lg:col-span-1">
          <GenerationButtonsPanel
            onGenerateSelectedPeriod={handleGenerateSelectedPeriodPayslips}
            onGenerateAllCurrentPeriodDownload={() => handleGenerateAllCurrentPeriodPayslips('download')}
            disabledSelectedPeriod={!selectedPayPeriodDate || allEmployees.length === 0}
            disabledCurrentPeriod={allEmployees.length === 0 || payslips.length === 0}
          />
        </div>
      </div>
    </div>
  );
};

export default PayslipGenerationSection;