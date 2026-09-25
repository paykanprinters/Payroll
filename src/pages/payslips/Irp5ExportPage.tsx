"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportDesignSettings, DEFAULT_REPORT_DESIGN_SETTINGS } from "@/lib/report-design-interfaces";
import useReportDesignSettings from "@/hooks/use-report-design-settings";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useUserTaxSettings } from "@/hooks/use-user-tax-settings";
import { formatEmployeePickerLabel } from "@/lib/employment-status";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import { showError, showSuccess } from "@/utils/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  filterPayslipsForSarsTaxYear,
  getSarsTaxYearPeriodLabel,
  taxYearFromSelectedDate,
} from "@/lib/tax-year-period";
import {
  buildEmployeeTaxCertificate,
  getEmployeeTaxCertificateLabel,
} from "@/lib/irp5-certificate";
import {
  buildEasyFileExport,
  easyFileExportFilename,
  serializeEasyFileCsv,
} from "@/lib/report-generators/easyfile-export";
import { validateEasyFileCsvStructure } from "@/lib/report-generators/easyfile-validation";
import EasyFileValidationPanel from "@/components/reports/EasyFileValidationPanel";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarIcon, Download, FileText, Printer, Users } from "lucide-react";

const Irp5ExportPage: React.FC = () => {
  const { employees, payslips, companyDetails, isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { userTaxSettings } = useUserTaxSettings({ isMockDataEnabled: false, isAuthenticated, isLoadingAuth });
  const { settings: baseReportDesignSettings } = useReportDesignSettings();

  const reportDesignSettings: ReportDesignSettings = {
    ...baseReportDesignSettings,
    irp5ContentFontSize:
      userTaxSettings?.irp5ContentFontSize ??
      baseReportDesignSettings.irp5ContentFontSize ??
      DEFAULT_REPORT_DESIGN_SETTINGS.irp5ContentFontSize,
  };

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedIrpYear, setSelectedIrpYear] = useState<Date | undefined>(undefined);

  const { downloadPdf, openPdf } = usePdfVector();

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);

  const certificatePreview = React.useMemo(() => {
    if (!selectedEmployee || !selectedIrpYear || !companyDetails) return null;
    const taxYear = taxYearFromSelectedDate(selectedIrpYear);
    const payslipsForYear = filterPayslipsForSarsTaxYear(
      payslips,
      taxYear,
      selectedEmployeeId
    );
    if (payslipsForYear.length === 0) return null;
    return buildEmployeeTaxCertificate(
      selectedEmployee,
      payslipsForYear,
      companyDetails,
      taxYear
    );
  }, [selectedEmployee, selectedIrpYear, companyDetails, payslips, selectedEmployeeId]);

  const handleGenerateIrp5 = useCallback(
    async (action: "print" | "download") => {
      if (!userTaxSettings?.enableIrp5Export) {
        showError("IRP5 Export is disabled. Please enable it in Settings > Tax Liabilities.");
        return;
      }
      if (!selectedEmployee || !selectedIrpYear || !companyDetails) {
        showError(
          "Please select an employee and an IRP Year, and ensure company details are loaded to generate the IRP5 Export."
        );
        return;
      }

      const taxYear = taxYearFromSelectedDate(selectedIrpYear);
      const payslipsForYear = filterPayslipsForSarsTaxYear(
        payslips,
        taxYear,
        selectedEmployeeId
      );

      if (payslipsForYear.length === 0) {
        showError(
          `No payslips found for ${selectedEmployee.firstName} ${selectedEmployee.lastName} in tax year ${taxYear} (${getSarsTaxYearPeriodLabel(taxYear)}).`
        );
        return;
      }

      const cert = buildEmployeeTaxCertificate(
        selectedEmployee,
        payslipsForYear,
        companyDetails,
        taxYear
      );
      if (!cert.validation.isValid) {
        showError(
          cert.validation.errors.map((e) => e.message).join(" ")
        );
        return;
      }
      if (cert.validation.warnings.length > 0) {
        console.warn("IRP5 export warnings:", cert.validation.warnings);
      }

      const { default: Irp5PdfDocument } = await import(
        "@/components/reports/Irp5PdfDocument"
      );
      const doc = (
        <Irp5PdfDocument
          employee={selectedEmployee}
          payslipsForYear={payslipsForYear}
          companyDetails={companyDetails}
          year={taxYear}
        />
      );
      const typeLabel = getEmployeeTaxCertificateLabel(cert.certificateType);
      const filename = `${cert.certificateType.toLowerCase()}-export-${selectedEmployee.id}-${taxYear}.pdf`;

      if (action === "download") {
        await downloadPdf(doc, filename);
      } else {
        await openPdf(doc, `${typeLabel} Export — TY${taxYear}`);
      }
    },
    [userTaxSettings, selectedEmployee, selectedIrpYear, companyDetails, payslips, selectedEmployeeId, downloadPdf, openPdf]
  );

  const isDisabled = !selectedEmployeeId || !selectedIrpYear || !userTaxSettings?.enableIrp5Export;

  const handleBulkEasyFileExport = useCallback(() => {
    if (!userTaxSettings?.enableIrp5Export) {
      showError("IRP5 Export is disabled. Please enable it in Settings > Tax Liabilities.");
      return;
    }
    if (!selectedIrpYear || !companyDetails) {
      showError("Please select a tax year and ensure company details are loaded.");
      return;
    }

    const taxYear = taxYearFromSelectedDate(selectedIrpYear);
    const exportData = buildEasyFileExport(employees, payslips, companyDetails, taxYear);

    if (exportData.rows.length === 0) {
      showError(
        `No certificates to export for tax year ${taxYear} (${getSarsTaxYearPeriodLabel(taxYear)}).`
      );
      return;
    }

    if (exportData.hasBlockingErrors) {
      const preview = exportData.validation.errors
        .slice(0, 3)
        .map((e) => (e.employeeName ? `${e.employeeName}: ${e.message}` : e.message))
        .join(" · ");
      showError(
        `e@syFile validation failed (${exportData.errorCount} error(s)). ${preview}${
          exportData.errorCount > 3 ? " …" : ""
        }`
      );
      return;
    }

    const csv = serializeEasyFileCsv(exportData);
    const structureIssues = validateEasyFileCsvStructure(csv);
    if (structureIssues.some((i) => i.severity === "error")) {
      showError(structureIssues.map((i) => i.message).join(" "));
      return;
    }
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = easyFileExportFilename(taxYear);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const notes: string[] = [`${exportData.rows.length} certificate(s) exported`];
    if (exportData.skipped.length > 0) {
      notes.push(`${exportData.skipped.length} employee(s) skipped (no payslips)`);
    }
    if (exportData.warningCount > 0) {
      notes.push(`${exportData.warningCount} warning(s) — review recommended before eFiling`);
    }
    showSuccess(notes.join(" · "));
  }, [userTaxSettings, selectedIrpYear, companyDetails, employees, payslips]);

  const bulkPreview = React.useMemo(() => {
    if (!selectedIrpYear || !companyDetails) return null;
    const taxYear = taxYearFromSelectedDate(selectedIrpYear);
    return buildEasyFileExport(employees, payslips, companyDetails, taxYear);
  }, [selectedIrpYear, companyDetails, employees, payslips]);

  const isBulkDisabled = !selectedIrpYear || !userTaxSettings?.enableIrp5Export;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>IRP5 / IT3(a) Export</CardTitle>
          <CardDescription>
            Generate an employee tax certificate PDF. The system selects IRP5 when PAYE was deducted,
            or IT3(a) when remuneration was paid without PAYE (e.g. below the tax threshold).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="mt-1 rounded-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {formatEmployeePickerLabel(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employees.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">No employees available.</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">IRP Tax Year</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "mt-1 w-full justify-start rounded-full text-left font-normal",
                      !selectedIrpYear && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedIrpYear ? format(selectedIrpYear, "yyyy") : <span>Pick a year</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedIrpYear} onSelect={setSelectedIrpYear} initialFocus />
                </PopoverContent>
              </Popover>
              <p className="mt-1 text-xs text-muted-foreground">
                SARS tax year runs 1 March – 28 February (e.g. TY2027 = Mar 2026 – Feb 2027).
              </p>
            </div>
          </div>

          {certificatePreview && (
            <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">
                Certificate type:{" "}
                {getEmployeeTaxCertificateLabel(certificatePreview.certificateType)}
              </p>
              <p className="text-muted-foreground">
                {certificatePreview.certificateNumber} · {certificatePreview.payslipCount} pay period(s) ·
                R {certificatePreview.totals.grossRemuneration.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}{" "}
                remuneration
                {certificatePreview.totals.payeDeducted > 0
                  ? ` · R ${certificatePreview.totals.payeDeducted.toLocaleString("en-ZA", { minimumFractionDigits: 2 })} PAYE`
                  : " · no PAYE deducted"}
              </p>
              {certificatePreview.validation.warnings.length > 0 && (
                <p className="mt-2 text-amber-700">
                  {certificatePreview.validation.warnings.map((w) => w.message).join(" ")}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-full" disabled={isDisabled}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleGenerateIrp5("print")} disabled={isDisabled}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateIrp5("download")} disabled={isDisabled}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk e@syFile Export (CSV)</CardTitle>
          <CardDescription>
            Export all employees' IRP5 / IT3(a) certificates for the selected tax year as a
            comma-delimited file for SARS e@syFile Employer. Amounts are declared in whole rands.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bulkPreview && (
            <>
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <p className="font-medium">
                  {bulkPreview.rows.length} certificate(s) ready for TY{bulkPreview.taxYear} (
                  {bulkPreview.periodLabel})
                </p>
                <p className="text-muted-foreground">
                  {bulkPreview.rows.filter((r) => r.certificate.certificateType === "IRP5").length} IRP5 ·{" "}
                  {bulkPreview.rows.filter((r) => r.certificate.certificateType === "IT3a").length} IT3(a)
                  {bulkPreview.skipped.length > 0
                    ? ` · ${bulkPreview.skipped.length} skipped (no payslips)`
                    : ""}
                </p>
              </div>
              <EasyFileValidationPanel
                validation={bulkPreview.validation}
                certificateCount={bulkPreview.rows.length}
              />
            </>
          )}
          <Button
            className="rounded-full"
            onClick={handleBulkEasyFileExport}
            disabled={isBulkDisabled || Boolean(bulkPreview?.hasBlockingErrors)}
          >
            <Users className="mr-2 h-4 w-4" />
            Download e@syFile CSV
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Import the file in e@syFile Employer under Utilities &gt; Import Payroll File, then verify
            totals against your EMP501 reconciliation before submission.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Irp5ExportPage;