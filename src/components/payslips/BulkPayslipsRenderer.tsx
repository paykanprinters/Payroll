"use client";

import React from "react";
import { MockPayslip, PayslipDesignSettings, MockCompanyDetails, MockEmployee } from "@/lib/mock-data-interfaces";
import IndividualPayslipCard from "./IndividualPayslipCard";

interface Props {
  payslips: MockPayslip[];
  getEmployeeName: (id: string) => string;
  // Additional props used by callers (kept optional for flexibility)
  payslipDesignSettings?: PayslipDesignSettings;
  companyDetails?: MockCompanyDetails | null;
  employees?: MockEmployee[];
  onReadyForPdf?: () => void;
  isPdfGeneration?: boolean; // indicate PDF generation context
}

const BulkPayslipsRenderer: React.FC<Props> = ({
  payslips,
  getEmployeeName,
  payslipDesignSettings,
  companyDetails,
  employees,
  onReadyForPdf,
  isPdfGeneration,
}) => {
  React.useEffect(() => {
    // Defer a tick to allow children to mount before notifying PDF generator
    if (onReadyForPdf) {
      const t = setTimeout(() => onReadyForPdf(), 0);
      return () => clearTimeout(t);
    }
  }, [onReadyForPdf]);

  // We rely on callers to supply design settings, company details and employees (already enforced in the generation flow)
  const settings = payslipDesignSettings as PayslipDesignSettings;
  const company = companyDetails as MockCompanyDetails;
  const people = (employees || []) as MockEmployee[];

  return (
    <div className="flex flex-col gap-6">
      {payslips.map((p) => (
        <React.Fragment key={p.id}>
          <div
            className="w-full pdf-page"
            style={{ pageBreakAfter: "always", pageBreakInside: "avoid" }}
          >
            <IndividualPayslipCard
              payslip={p}
              payslipDesignSettings={settings}
              companyDetails={company}
              employees={people}
              getEmployeeName={getEmployeeName}
              isPdfGeneration={!!isPdfGeneration}
            />
          </div>
          <div style={{ pageBreakBefore: "always" }} />
        </React.Fragment>
      ))}
    </div>
  );
};

export default BulkPayslipsRenderer;