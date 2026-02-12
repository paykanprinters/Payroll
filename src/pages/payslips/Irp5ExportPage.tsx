"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import { generateIrp5ExportContent } from "@/lib/report-generators";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Printer, Download, CalendarIcon } from "lucide-react";
import { showError } from "@/utils/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isSameYear } from "date-fns";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useUserTaxSettings } from "@/hooks/use-user-tax-settings";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

const Irp5ExportPage: React.FC = () => {
  const { employees, payslips, companyDetails, isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { userTaxSettings } = useUserTaxSettings({ isMockDataEnabled: false, isAuthenticated, isLoadingAuth });

  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedIrpYear, setSelectedIrpYear] = useState<Date | undefined>(undefined);

  const { generatePdf, printPdf } = usePdfGenerator();

  const loadData = useCallback(() => {
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      const parsedSettings = JSON.parse(savedReportDesignSettings);
      setReportDesignSettings({
        ...parsedSettings,
        irp5ContentFontSize: userTaxSettings?.irp5ContentFontSize ?? DEFAULT_REPORT_DESIGN_SETTINGS.irp5ContentFontSize,
      });
    } else {
      const initialSettings = {
        ...DEFAULT_REPORT_DESIGN_SETTINGS,
        irp5ContentFontSize: userTaxSettings?.irp5ContentFontSize ?? DEFAULT_REPORT_DESIGN_SETTINGS.irp5ContentFontSize,
      };
      localStorage.setItem("reportDesignSettings", JSON.stringify(initialSettings));
      setReportDesignSettings(initialSettings);
    }
  }, [userTaxSettings]);

  useEffect(() => {
    loadData();
    window.addEventListener("employeesUpdated", loadData);
    window.addEventListener("payslipsUpdated", loadData);
    window.addEventListener("companyDetailsUpdated", loadData);
    window.addEventListener("reportDesignUpdated", loadData);
    window.addEventListener("userTaxSettingsUpdated", loadData);
    return () => {
      window.removeEventListener("employeesUpdated", loadData);
      window.removeEventListener("payslipsUpdated", loadData);
      window.removeEventListener("companyDetailsUpdated", loadData);
      window.removeEventListener("reportDesignUpdated", loadData);
      window.removeEventListener("userTaxSettingsUpdated", loadData);
    };
  }, [loadData]);

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);

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

      const year = selectedIrpYear.getFullYear();
      const payslipsForYear = payslips.filter(
        (p) => p.employeeId === selectedEmployeeId && isSameYear(new Date(p.payPeriod.substring(0, 4)), selectedIrpYear)
      );

      if (payslipsForYear.length === 0) {
        showError(`No payslips found for ${selectedEmployee.firstName} ${selectedEmployee.lastName} in ${year}.`);
        return;
      }

      const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
        <ReportContentWrapper
          reportTitle={`IRP5 Certificate - Tax Year ${year}`}
          reportContent={generateIrp5ExportContent(
            selectedEmployee,
            payslipsForYear,
            companyDetails,
            reportDesignSettings,
            year
          )}
          companyDetails={companyDetails}
          reportDesignSettings={reportDesignSettings}
          isPdfGeneration={true}
          onReadyForPdf={onReadyForPdf}
        />
      );

      const options = {
        filename: `irp5-export-${selectedEmployee.id}-${year}.pdf`,
        format: reportDesignSettings.defaultReportPaperSize.toLowerCase() as "a4" | "letter" | "a5",
        documentType: "report" as const,
      };

      if (action === "download") {
        await generatePdf(renderComponent, options);
      } else {
        await printPdf(renderComponent, options);
      }
    },
    [
      userTaxSettings,
      selectedEmployee,
      selectedIrpYear,
      companyDetails,
      payslips,
      selectedEmployeeId,
      reportDesignSettings,
      generatePdf,
      printPdf,
    ]
  );

  const isDisabled = !selectedEmployeeId || !selectedIrpYear || !userTaxSettings?.enableIrp5Export;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>IRP5 Export</CardTitle>
          <CardDescription>Generate an IRP5 certificate PDF for an employee and a SARS tax year.</CardDescription>
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
                      {emp.firstName} {emp.lastName}
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
            </div>
          </div>

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
    </div>
  );
};

export default Irp5ExportPage;