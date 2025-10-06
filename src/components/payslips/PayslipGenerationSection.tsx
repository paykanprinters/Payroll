"use client";

import React, { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MockEmployee, MockPayslip, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { format, isSameMonth, isSameYear } from "date-fns";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import IndividualPayslipCard from "./IndividualPayslipCard";
import EmployeePayslipSelector from "./EmployeePayslipSelector";
import IndividualPayslipActions from "./IndividualPayslipActions";
import BulkPayslipActions from "./BulkPayslipActions";
import BulkPayslipsRenderer from "./BulkPayslipsRenderer"; // Import the new component
import { showError } from "@/utils/toast"; // Ensure showError is imported

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
  const { generatePdf, printPdf } = usePdfGenerator();

  const filteredPayslipsForEmployee = payslips.filter(p => p.employeeId === selectedEmployeeId);
  const selectedPayslip = payslips.find(p => p.id === selectedPayslipId);

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

  const handlePrintOrDownloadIndividual = useCallback(async (action: 'print' | 'download') => {
    if (!selectedPayslip) {
      showError(`Please select a payslip to ${action}.`);
      return;
    }

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
      format: payslipDesignSettings.layoutSize?.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'payslip' as const, // Specify document type
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [selectedPayslip, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, generatePdf, printPdf]);

  const handlePrintOrDownloadAll = useCallback(async (action: 'print' | 'download') => {
    if (!selectedPayPeriodDate) {
      showError("Please select a pay period date to generate all payslips.");
      return;
    }

    const payslipsForPeriod = payslips.filter(p => {
      const [startPeriodStr] = p.payPeriod.split(' - ');
      const payslipDate = new Date(startPeriodStr);
      return isSameMonth(payslipDate, selectedPayPeriodDate) && isSameYear(payslipDate, selectedPayPeriodDate);
    });

    if (payslipsForPeriod.length === 0) {
      showError(`No payslips found for the selected pay period (${format(selectedPayPeriodDate, 'MMM yyyy')}).`);
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <BulkPayslipsRenderer
        payslips={payslipsForPeriod}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={allEmployees}
        getEmployeeName={getEmployeeName}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `all-payslips-${format(selectedPayPeriodDate, 'yyyy-MM')}.pdf`,
      format: payslipDesignSettings.layoutSize?.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'payslip' as const, // Specify document type
    };

    if (action === 'download') {
      await generatePdf(renderComponent, options);
    } else {
      await printPdf(renderComponent, options);
    }
  }, [selectedPayPeriodDate, payslips, payslipDesignSettings, companyDetails, allEmployees, getEmployeeName, generatePdf, printPdf]);


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
            onPrint={() => handlePrintOrDownloadIndividual('print')}
            onDownload={() => handlePrintOrDownloadIndividual('download')}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 items-end">
          <BulkPayslipActions
            payslips={payslips}
            selectedPayPeriodDate={selectedPayPeriodDate}
            setSelectedPayPeriodDate={setSelectedPayPeriodDate}
            onPrintAll={() => handlePrintOrDownloadAll('print')}
            onDownloadAll={() => handlePrintOrDownloadAll('download')}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PayslipGenerationSection;