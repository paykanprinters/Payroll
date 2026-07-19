"use client";

import React, { useCallback } from "react";
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { filterPayslipsForBulkPeriod } from "@/lib/payslip-period-filter";
import { buildPayslipEmailPayload } from "@/lib/email/build-payslip-email-payload";
import { buildPayslipSmsPayload } from "@/lib/sms/build-payslip-sms-payload";
import { sendPayslipEmail, sendPayslipSms } from "@/integrations/supabase/notification-queries";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import EmployeePayslipSelector from "./EmployeePayslipSelector";
import BulkPayslipActions from "./BulkPayslipActions";
import { saveGeneratedReport, computeChecksum } from "@/integrations/supabase/generated-reports";
import { generatePayrollSummaryReportContent, generateEmployeePayslipReportContent } from "@/lib/report-generators";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import useReportDesignSettings from "@/hooks/use-report-design-settings";

// Vector PDF helpers
import { usePdfVector } from "@/hooks/use-pdf-vector";
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
  const { settings: reportDesignSettings } = useReportDesignSettings();

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
    if (!selectedPayslip) {
      showError(`Please select a payslip to ${action}.`);
      return;
    }

    const { default: PayslipPdfDocument } = await import("./PayslipPdfDocument");
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
    if (!selectedPayPeriodDate) {
      showError("Please select a pay period date to generate all payslips.");
      return;
    }

    const settings = payCycleSettings ? {
      cutOffDay: payCycleSettings.cutOffDay,
      payDayOffset: payCycleSettings.payDayOffset,
    } : { cutOffDay: 2, payDayOffset: 0 };

    const payslipsForPeriod = filterPayslipsForBulkPeriod(
      payslips,
      allEmployees,
      selectedPayPeriodDate,
      mode,
      settings
    );

    if (payslipsForPeriod.length === 0) {
      showError(`No ${mode} payslips found for the selected period (${format(selectedPayPeriodDate, mode === "monthly" ? 'MMM yyyy' : 'PPP')}). Generate payslips for that period first.`);
      return;
    }

    if (level === "detailed") {
      const nonCashEmployees = allEmployees.filter(e => e.paymentMode !== "Cash");
      const nonCashIds = new Set(nonCashEmployees.map(e => e.id));
      const payslipsForReports = payslipsForPeriod.filter(p => nonCashIds.has(p.employeeId));

      const reportPeriodLabel = format(selectedPayPeriodDate, mode === "monthly" ? "MMMM yyyy" : "PPP");
      const reportOptions = { skipDateFilter: true, reportPeriodDescription: reportPeriodLabel };

      const payrollSummaryHtml = generatePayrollSummaryReportContent(payslipsForReports, nonCashEmployees, selectedPayPeriodDate, mode, level, reportOptions);
      const employeePayslipHtml = generateEmployeePayslipReportContent(payslipsForReports, nonCashEmployees, selectedPayPeriodDate, mode, level, reportOptions);
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

    const [
      { pdf: pdfRenderer },
      { default: ReportPdfDocument },
      { default: PayslipPdfDocument },
    ] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/reports/ReportPdfDocument"),
      import("./PayslipPdfDocument"),
    ]);
    const reportsDoc = (
      <ReportPdfDocument
        payslips={payslips}
        periodPayslips={payslipsForPeriod}
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
    } catch (e: unknown) {
      showError(`Bulk ${action} failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [selectedPayPeriodDate, payslips, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, reportDesignSettings, payCycleSettings, downloadZip, openPdf]);

  const handleGenerateAllCurrentPeriodPayslips = React.useCallback(async (action: 'print' | 'download') => {

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
      showError("No payslips found for the current period. Generate payslips first, then export.");
      return;
    }

    if (auditLevel === "detailed") {
      const nonCashEmployees = allEmployees.filter(e => e.paymentMode !== "Cash");
      const nonCashIds = new Set(nonCashEmployees.map(e => e.id));
      const payslipsForReports = payslipsForCurrentPeriod.filter(p => nonCashIds.has(p.employeeId));

      const reportPeriodLabel = format(today, "PPP");
      const reportOptions = { skipDateFilter: true, reportPeriodDescription: reportPeriodLabel };

      const mode: "monthly" | "weekly" = "monthly";
      const payrollSummaryHtml = generatePayrollSummaryReportContent(payslipsForReports, nonCashEmployees, today, mode, auditLevel, reportOptions);
      const employeePayslipHtml = generateEmployeePayslipReportContent(payslipsForReports, nonCashEmployees, today, mode, auditLevel, reportOptions);
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

    const [
      { pdf: pdfRenderer },
      { default: ReportPdfDocument },
      { default: PayslipPdfDocument },
    ] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/reports/ReportPdfDocument"),
      import("./PayslipPdfDocument"),
    ]);
    const reportsDoc = (
      <ReportPdfDocument
        payslips={payslips}
        periodPayslips={payslipsForCurrentPeriod}
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
    } catch (e: unknown) {
      showError(`Bulk ${action} failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [allEmployees, payslips, payslipDesignSettings, companyDetails, getEmployeeName, auditLevel, reportDesignSettings, payCycleSettings, downloadZip, openPdf]);

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

  const companyNameForEmail =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Payroll";

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const emailOnePayslip = useCallback(
    async (slip: MockPayslip): Promise<{ ok: boolean; reason?: string; error?: string }> => {
      const employee = allEmployees.find((e) => e.id === slip.employeeId);
      if (!employee) return { ok: false, reason: "no-employee" };

      const built = buildPayslipEmailPayload(employee, slip, companyNameForEmail);
      if (!built.ok) return { ok: false, reason: built.reason };

      const [{ pdf: pdfRenderer }, { default: PayslipPdfDocument }] =
        await Promise.all([
          import("@react-pdf/renderer"),
          import("./PayslipPdfDocument"),
        ]);
      const doc = (
        <PayslipPdfDocument
          payslips={[slip]}
          employees={allEmployees}
          companyDetails={companyDetails}
          payslipDesignSettings={payslipDesignSettings}
          getEmployeeName={getEmployeeName}
        />
      );
      const blob = await pdfRenderer(doc).toBlob();
      const pdfBase64 = await blobToBase64(blob);
      return sendPayslipEmail(built.payload, pdfBase64);
    },
    [allEmployees, companyDetails, companyNameForEmail, payslipDesignSettings, getEmployeeName]
  );

  const handleEmailIndividualPayslip = useCallback(async () => {
    if (!selectedPayslip) {
      showError("Select a payslip first.");
      return;
    }
    const toastId = showLoading("Emailing payslip…") as string;
    try {
      const res = await emailOnePayslip(selectedPayslip);
      if (res.ok) {
        showSuccess("Payslip emailed to employee.");
      } else if (res.reason === "no-email") {
        showError("That employee has no email address on file.");
      } else {
        showError(res.error || "Failed to email payslip.");
      }
    } catch (e: unknown) {
      showError(`Failed to email payslip: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      dismissToast(toastId);
    }
  }, [selectedPayslip, emailOnePayslip]);

  const handleEmailAllPayslips = useCallback(
    async (mode: "monthly" | "weekly") => {
      if (!selectedPayPeriodDate) {
        showError("Select a pay period date first.");
        return;
      }
      const settings = payCycleSettings
        ? { cutOffDay: payCycleSettings.cutOffDay, payDayOffset: payCycleSettings.payDayOffset }
        : { cutOffDay: 2, payDayOffset: 0 };

      const periodSlips = filterPayslipsForBulkPeriod(
        payslips,
        allEmployees,
        selectedPayPeriodDate,
        mode,
        settings
      );

      if (periodSlips.length === 0) {
        showError(`No ${mode} payslips found for the selected period.`);
        return;
      }

      const toastId = showLoading(`Emailing ${periodSlips.length} payslip(s)…`) as string;
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      try {
        for (const slip of periodSlips) {
          const res = await emailOnePayslip(slip);
          if (res.ok) sent++;
          else if (res.reason === "no-email" || res.reason === "no-employee") skipped++;
          else failed++;
        }
      } finally {
        dismissToast(toastId);
      }

      const parts = [`Emailed ${sent} payslip(s).`];
      if (skipped) parts.push(`${skipped} skipped (no email).`);
      if (failed) parts.push(`${failed} failed.`);
      if (failed) showError(parts.join(" "));
      else showSuccess(parts.join(" "));
    },
    [selectedPayPeriodDate, payCycleSettings, payslips, allEmployees, emailOnePayslip]
  );

  const smsOnePayslip = useCallback(
    async (slip: MockPayslip): Promise<{ ok: boolean; reason?: string; error?: string }> => {
      const employee = allEmployees.find((e) => e.id === slip.employeeId);
      if (!employee) return { ok: false, reason: "no-employee" };

      const built = buildPayslipSmsPayload(employee, slip, companyNameForEmail);
      if (!built.ok) return { ok: false, reason: built.reason };

      return sendPayslipSms(built.payload);
    },
    [allEmployees, companyNameForEmail]
  );

  const handleSmsIndividualPayslip = useCallback(async () => {
    if (!selectedPayslip) {
      showError("Select a payslip first.");
      return;
    }
    const toastId = showLoading("Sending SMS alert…") as string;
    try {
      const res = await smsOnePayslip(selectedPayslip);
      if (res.ok) {
        showSuccess("Payslip SMS alert sent to employee.");
      } else if (res.reason === "no-phone") {
        showError("That employee has no valid mobile number on file.");
      } else {
        showError(res.error || "Failed to send SMS alert.");
      }
    } catch (e: unknown) {
      showError(`Failed to send SMS: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      dismissToast(toastId);
    }
  }, [selectedPayslip, smsOnePayslip]);

  const handleSmsAllPayslips = useCallback(
    async (mode: "monthly" | "weekly") => {
      if (!selectedPayPeriodDate) {
        showError("Select a pay period date first.");
        return;
      }
      const settings = payCycleSettings
        ? { cutOffDay: payCycleSettings.cutOffDay, payDayOffset: payCycleSettings.payDayOffset }
        : { cutOffDay: 2, payDayOffset: 0 };

      const periodSlips = filterPayslipsForBulkPeriod(
        payslips,
        allEmployees,
        selectedPayPeriodDate,
        mode,
        settings
      );

      if (periodSlips.length === 0) {
        showError(`No ${mode} payslips found for the selected period.`);
        return;
      }

      const toastId = showLoading(`Sending ${periodSlips.length} SMS alert(s)…`) as string;
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      try {
        for (const slip of periodSlips) {
          const res = await smsOnePayslip(slip);
          if (res.ok) sent++;
          else if (res.reason === "no-phone" || res.reason === "no-employee") skipped++;
          else failed++;
        }
      } finally {
        dismissToast(toastId);
      }

      const parts = [`Sent ${sent} SMS alert(s).`];
      if (skipped) parts.push(`${skipped} skipped (no mobile).`);
      if (failed) parts.push(`${failed} failed.`);
      if (failed) showError(parts.join(" "));
      else showSuccess(parts.join(" "));
    },
    [selectedPayPeriodDate, payCycleSettings, payslips, allEmployees, smsOnePayslip]
  );

  return (
    <div className="space-y-6">
      {/* Row 1: Employee & payslip selection + actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
        {/* Left: selectors */}
        <div className="md:col-span-1 lg:col-span-2 grid gap-3">
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
        <div className="md:col-span-1 lg:col-span-1 md:mt-6">
          <IndividualActionsPanel
            selectedPayslip={selectedPayslip}
            selectedEmployeeId={selectedEmployeeId}
            onSelectCurrentPeriodPayslip={handleSelectCurrentPeriodPayslip}
            onPrint={() => handlePrintOrDownloadIndividual('print')}
            onDownload={() => handlePrintOrDownloadIndividual('download')}
            onEmail={handleEmailIndividualPayslip}
            onSmsAlert={handleSmsIndividualPayslip}
          />
        </div>
      </div>

      <div className="border-t" />

      {/* Row 2: Bulk actions + generation buttons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
        {/* Left: bulk controls */}
        <div className="md:col-span-1 lg:col-span-2 grid gap-3">
          <BulkPayslipActions
            payslips={payslips}
            selectedPayPeriodDate={selectedPayPeriodDate}
            setSelectedPayPeriodDate={setSelectedPayPeriodDate}
            bulkGenerationMode={bulkGenerationMode}
            setBulkGenerationMode={setBulkGenerationMode}
            onPrintAll={handlePrintOrDownloadAll}
            onDownloadAll={handlePrintOrDownloadAll}
            onEmailAll={handleEmailAllPayslips}
            onSmsAlertAll={handleSmsAllPayslips}
            auditLevel={auditLevel}
            setAuditLevel={setAuditLevel}
          />
        </div>

        {/* Right: generation buttons panel */}
        <div className="md:col-span-1 lg:col-span-1 md:mt-6">
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