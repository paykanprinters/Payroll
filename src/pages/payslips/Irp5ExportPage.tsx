"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import EmployeePayslipSelector from "@/components/payslips/EmployeePayslipSelector";
import { generateIrp5ExportContent } from "@/lib/report-generators";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, Printer, Download } from "lucide-react";
import { showError } from "@/utils/toast";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
};

const Irp5ExportPage: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [companyDetails, setCompanyDetails] = useState<MockCompanyDetails | null>(null);
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);
  const [isIrp5ExportEnabled, setIsIrp5ExportEnabled] = useState<boolean>(() => {
    return localStorage.getItem("enableIrp5Export") === "true";
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPayslipId, setSelectedPayslipId] = useState<string>("");

  const { generatePdf, printPdf } = usePdfGenerator();

  const loadData = useCallback(() => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    setEmployees(storedEmployees ? JSON.parse(storedEmployees) : []);

    const storedPayslips = localStorage.getItem("mockPayslips");
    setPayslips(storedPayslips ? JSON.parse(storedPayslips) : []);

    const companyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
    const companyTradingName = localStorage.getItem('companyTradingName') || "";
    const companyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
    const vatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
    const physicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
    const postalAddress = localStorage.getItem('postalAddress') || "PO Box 123, Business Centre, 2001";
    const mainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
    const alternativeContactNumber = localStorage.getItem('alternativeContactNumber') || "";
    const companyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
    const companyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";
    const bankName = localStorage.getItem('bankName') || "";
    const accountHolderName = localStorage.getItem('accountHolderName') || "";
    const accountNumber = localStorage.getItem('accountNumber') || "";
    const branchCode = localStorage.getItem('branchCode') || "";
    const accountType = (localStorage.getItem('accountType') as "Cheque" | "Savings" | "Business") || "Cheque";
    const logoUrl = localStorage.getItem('companyLogoUrl') || '';
    const logoSize = parseFloat(localStorage.getItem('companyLogoSize') || '40');

    setCompanyDetails({
      companyLegalName, companyTradingName, companyRegistrationNumber,
      companyTaxNumber: localStorage.getItem('companyTaxNumber') || "",
      vatRegistrationNumber, industry: localStorage.getItem('industry') || "",
      payeReferenceNumber: localStorage.getItem('payeReferenceNumber') || "",
      uifReferenceNumber: localStorage.getItem('uifReferenceNumber') || "",
      sdlReferenceNumber: localStorage.getItem('sdlReferenceNumber') || "",
      coidaRegistrationNumber: localStorage.getItem('coidaRegistrationNumber') || "",
      physicalAddress, postalAddress, mainContactNumber, alternativeContactNumber,
      companyEmail, companyWebsite, bankName, accountHolderName, accountNumber,
      branchCode, accountType, logoUrl, logoSize,
    });

    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }

    setIsIrp5ExportEnabled(localStorage.getItem("enableIrp5Export") === "true");
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('mockDataUpdated', loadData);
    window.addEventListener('companyDetailsUpdated', loadData);
    window.addEventListener('reportDesignUpdated', loadData);
    window.addEventListener('irp5SettingsUpdated', loadData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadData);
      window.removeEventListener('companyDetailsUpdated', loadData);
      window.removeEventListener('reportDesignUpdated', loadData);
      window.removeEventListener('irp5SettingsUpdated', loadData);
    };
  }, [loadData]);

  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);
  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

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

  const handleGenerateIrp5 = useCallback(async (action: 'print' | 'download') => {
    if (!isIrp5ExportEnabled) {
      showError("IRP5 Export is disabled. Please enable it in Settings > Tax Liabilities.");
      return;
    }
    if (!selectedEmployee || !selectedPayslip || !companyDetails) {
      showError("Please select an employee and a payslip, and ensure company details are loaded to generate the IRP5 Export.");
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <ReportContentWrapper
        reportTitle={`IRP5 Certificate - Tax Year ${selectedPayslip.payPeriod.substring(0, 4)}`}
        reportContent={generateIrp5ExportContent(selectedEmployee, selectedPayslip, companyDetails, reportDesignSettings)}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `irp5-export-${selectedEmployee.id}-${selectedPayslip.payPeriod.substring(0, 4)}.pdf`,
      format: reportDesignSettings.defaultReportPaperSize,
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [isIrp5ExportEnabled, selectedEmployee, selectedPayslip, companyDetails, reportDesignSettings, generatePdf, printPdf]);

  const isDisabled = !selectedEmployeeId || !selectedPayslipId || !isIrp5ExportEnabled;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">IRP5 Export</h1>
      <p className="text-lg text-muted-foreground">
        Generate IRP5 certificates for individual employees.
      </p>

      {!isIrp5ExportEnabled && (
        <Card className="border-yellow-500 bg-yellow-50 text-yellow-800">
          <CardHeader>
            <CardTitle>IRP5 Export Disabled</CardTitle>
            <CardDescription>
              IRP5 export functionality is currently disabled. Please enable it in{" "}
              <a href="/settings/tax-liabilities" className="underline font-semibold">Settings &gt; Tax Liabilities</a>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generate Individual IRP5</CardTitle>
          <CardDescription>
            Select an employee and a payslip to generate their IRP5 certificate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <EmployeePayslipSelector
              employees={employees}
              payslips={payslips}
              selectedEmployeeId={selectedEmployeeId}
              setSelectedEmployeeId={setSelectedEmployeeId}
              selectedPayslipId={selectedPayslipId}
              setSelectedPayslipId={setSelectedPayslipId}
              filteredPayslipsForEmployee={filteredPayslipsForEmployee}
            />
            <div className="md:col-span-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full" variant="outline" disabled={isDisabled}>
                    <FileText className="mr-2 h-4 w-4" /> Generate IRP5 Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleGenerateIrp5('print')} disabled={isDisabled}>
                    <Printer className="mr-2 h-4 w-4" /> Print IRP5
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleGenerateIrp5('download')} disabled={isDisabled}>
                    <Download className="mr-2 h-4 w-4" /> Download IRP5 PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-purple-50 text-purple-800">
        <h3 className="font-semibold text-lg mb-2">IRP5 Export Notes:</h3>
        <p className="text-sm">
          This is a simplified mock-up for demonstration purposes and does not represent a legally compliant SARS IRP5 certificate. A real IRP5 export requires complex tax calculations and official SARS integration.
        </p>
      </div>
    </div>
  );
};

export default Irp5ExportPage;