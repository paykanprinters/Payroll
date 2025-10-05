"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { format, isSameMonth, isSameYear } from "date-fns";
import { usePdfGenerator } from "@/hooks/use-pdf-generator"; // Import the new hook
import IndividualPayslipCard from "./IndividualPayslipCard";
import EmployeePayslipSelector from "./EmployeePayslipSelector";
import IndividualPayslipActions from "./IndividualPayslipActions";
import BulkPayslipActions from "./BulkPayslipActions";
import IndividualIrp5Actions from "./IndividualIrp5Actions";
import { generateIrp5ExportContent } from "@/lib/report-generators";
import ReportContentWrapper from "../reports/ReportContentWrapper";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

interface PayslipDesignSettings {
  showCompanyLogo?: boolean;
  showCompanyDetails?: boolean;
  showEmployeeDetails?: boolean;
  showEarningsBreakdown?: boolean;
  showDeductionsBreakdown?: boolean;
  showLeaveSummary?: boolean;
  showBankDetails?: boolean;
  showYTD?: boolean;
  sectionOrder?: ("Earnings" | "Deductions")[];
  layoutSize?: "Letter" | "A4" | "A5";
  earningsDeductionsLayout?: "deductions-left-earnings-right" | "earnings-left-deductions-right";
}

interface PayslipGenerationSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  selectedPayslipId: string;
  setSelectedPayslipId: (id: string) => void;
  getEmployeeName: (employeeId: string) => string;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails;
  allEmployees: MockEmployee[];
  isIrp5ExportEnabled: boolean;
  reportDesignSettings: ReportDesignSettings;
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
  isIrp5ExportEnabled,
  reportDesignSettings,
}) => {
  const [selectedPayPeriodDate, setSelectedPayPeriodDate] = React.useState<Date | undefined>(new Date());
  const { generatePdf, printPdf } = usePdfGenerator();

  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);
  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  React.useEffect(() => {
    if (selectedEmployeeId && filteredPayslipsForEmployee.length > 0) {
      const mostRecentPayslip = filteredPayslipsForEmployee.sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
      if (mostRecentPayslip && mostRecentPayslip.id !== selectedPayslipId) {
        setSelectedPayslipId(mostRecentPayslip.id);
      }
    } else if (!selectedEmployeeId && selectedPayslipId) {
      setSelectedPayslipId("");
    }
  }, [selectedEmployeeId, filteredPayslipsForEmployee, selectedPayslipId, setSelectedPayslipId]);

  const handleGenerateIndividualPayslip = useCallback(async (action: 'print' | 'download') => {
    if (!selectedPayslip) return;

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <IndividualPayslipCard
        payslip={selectedPayslip}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={allEmployees}
        getEmployeeName={getEmployeeName}
        isPdfGeneration={true}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `payslip-${selectedPayslip.employeeId}-${selectedPayslip.payPeriod}.pdf`,
      format: payslipDesignSettings.layoutSize,
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [selectedPayslip, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, generatePdf, printPdf]);

  const handleGenerateBulkPayslips = useCallback(async (action: 'print' | 'download') => {
    if (!selectedPayPeriodDate) return;

    const payslipsForPeriod = payslips.filter(p => {
      const [startPeriodStr] = p.payPeriod.split(' - ');
      const payslipDate = new Date(startPeriodStr);
      return isSameMonth(payslipDate, selectedPayPeriodDate) && isSameYear(payslipDate, selectedPayPeriodDate);
    });

    if (payslipsForPeriod.length === 0) {
      // Error message handled by BulkPayslipActions component
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <>
        {payslipsForPeriod.map((payslip, index) => (
          <React.Fragment key={payslip.id}>
            <IndividualPayslipCard
              payslip={payslip}
              payslipDesignSettings={payslipDesignSettings}
              companyDetails={companyDetails}
              employees={allEmployees}
              getEmployeeName={getEmployeeName}
              isPdfGeneration={true}
              onReadyForPdf={index === payslipsForPeriod.length - 1 ? onReadyForPdf : undefined} // Only last one signals readiness
            />
            {index < payslipsForPeriod.length - 1 && (
              <div style={{ pageBreakAfter: 'always' }}></div>
            )}
          </React.Fragment>
        ))}
      </>
    );

    const options = {
      filename: `all-payslips-${format(selectedPayPeriodDate, 'yyyy-MM')}.pdf`,
      format: payslipDesignSettings.layoutSize,
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [payslips, selectedPayPeriodDate, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, generatePdf, printPdf]);

  const handleGenerateIrp5 = useCallback(async (action: 'print' | 'download') => {
    if (!isIrp5ExportEnabled || !selectedEmployee || !selectedPayslip) return;

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


  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Payslips</CardTitle>
        <CardDescription>
          Generate individual payslips or a batch of all payslips for printing or downloading.
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
          <IndividualPayslipActions
            selectedPayslip={selectedPayslip}
            onPrint={() => handleGenerateIndividualPayslip('print')}
            onDownload={() => handleGenerateIndividualPayslip('download')}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 items-end">
          <BulkPayslipActions
            payslips={payslips}
            selectedPayPeriodDate={selectedPayPeriodDate}
            setSelectedPayPeriodDate={setSelectedPayPeriodDate}
            onPrintAll={() => handleGenerateBulkPayslips('print')}
            onDownloadAll={() => handleGenerateBulkPayslips('download')}
          />
        </div>

        <IndividualIrp5Actions
          isIrp5ExportEnabled={isIrp5ExportEnabled}
          selectedEmployee={selectedEmployee}
          selectedPayslip={selectedPayslip}
          onPrintIrp5={() => handleGenerateIrp5('print')}
          onDownloadIrp5={() => handleGenerateIrp5('download')}
        />
      </CardContent>
    </Card>
  );
};

export default PayslipGenerationSection;