"use client";

import React from "react";
import IndividualPayslipCard from "./IndividualPayslipCard";
import { MockEmployee, MockPayslip, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";

interface BulkPayslipsRendererProps {
  payslips: MockPayslip[];
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails | null; // Now accepts null
  employees: MockEmployee[];
  getEmployeeName: (employeeId: string) => string;
  onReadyForPdf?: () => void;
}

const BulkPayslipsRenderer: React.FC<BulkPayslipsRendererProps> = ({
  payslips,
  payslipDesignSettings,
  companyDetails,
  employees,
  getEmployeeName,
  onReadyForPdf,
}) => {
  const [loadedPayslipCount, setLoadedPayslipCount] = React.useState(0);
  const totalPayslips = payslips.length;

  React.useEffect(() => {
    if (loadedPayslipCount === totalPayslips && onReadyForPdf) {
      onReadyForPdf();
    }
  }, [loadedPayslipCount, totalPayslips, onReadyForPdf]);

  const handlePayslipReady = React.useCallback(() => {
    setLoadedPayslipCount(prevCount => prevCount + 1);
  }, []);

  if (totalPayslips === 0) {
    return <p>No payslips to render.</p>;
  }

  return (
    <div>
      {payslips.map((payslip, index) => (
        <React.Fragment key={payslip.id}>
          <IndividualPayslipCard
            payslip={payslip}
            payslipDesignSettings={payslipDesignSettings}
            companyDetails={companyDetails}
            employees={employees}
            getEmployeeName={getEmployeeName}
            isPdfGeneration={true}
            onReadyForPdf={handlePayslipReady}
          />
          {index < payslips.length - 1 && (
            <div style={{ pageBreakAfter: 'always' }}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default BulkPayslipsRenderer;