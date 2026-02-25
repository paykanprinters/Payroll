"use client";

import React from "react";
import { MockPayslip, MockEmployee, MockCompanyDetails, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
import BulkPayslipsRenderer from "./BulkPayslipsRenderer";
import {
  generatePayrollSummaryReportContent,
  generateEmployeePayslipReportContent,
} from "@/lib/report-generators";

type AuditLevel = "minimal" | "standard" | "detailed";

interface Props {
  payslips: MockPayslip[];
  employees: MockEmployee[];
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  auditLevel: AuditLevel;
  selectedDate: Date;
  mode: "monthly" | "weekly";
  getEmployeeName: (id: string) => string;
  isPdfGeneration?: boolean;
  onReadyForPdf?: () => void;
  payslipDesignSettings: PayslipDesignSettings;
}

const BulkPayslipsWithReportsRenderer: React.FC<Props> = ({
  payslips,
  employees,
  companyDetails,
  reportDesignSettings,
  auditLevel,
  selectedDate,
  mode,
  getEmployeeName,
  isPdfGeneration = true,
  onReadyForPdf,
  payslipDesignSettings,
}) => {
  const nonCashEmployees = React.useMemo(
    () => employees.filter((e) => e.paymentMode !== "Cash"),
    [employees]
  );
  const nonCashEmployeeIds = React.useMemo(
    () => new Set(nonCashEmployees.map((e) => e.id)),
    [nonCashEmployees]
  );
  const payslipsForReports = React.useMemo(
    () => payslips.filter((p) => nonCashEmployeeIds.has(p.employeeId)),
    [payslips, nonCashEmployeeIds]
  );

  const payrollSummaryHtml = React.useMemo(() => {
    return generatePayrollSummaryReportContent(payslipsForReports, nonCashEmployees, selectedDate, mode, auditLevel);
  }, [payslipsForReports, nonCashEmployees, selectedDate, mode, auditLevel]);

  const employeePayslipHtml = React.useMemo(() => {
    return generateEmployeePayslipReportContent(payslipsForReports, nonCashEmployees, selectedDate, mode, auditLevel);
  }, [payslipsForReports, nonCashEmployees, selectedDate, mode, auditLevel]);

  return (
    <div className="flex flex-col gap-6">
      <div className="pdf-page">
        <ReportContentWrapper
          reportTitle={`Payroll Summary Report (${mode === "monthly" ? "Monthly" : "Weekly"})`}
          reportContent={payrollSummaryHtml}
          companyDetails={companyDetails}
          reportDesignSettings={reportDesignSettings}
          isPdfGeneration={isPdfGeneration}
        />
      </div>
      <div style={{ pageBreakBefore: "always" }} />
      <div className="pdf-page">
        <ReportContentWrapper
          reportTitle={`Employee Payslip Report (${mode === "monthly" ? "Monthly" : "Weekly"})`}
          reportContent={employeePayslipHtml}
          companyDetails={companyDetails}
          reportDesignSettings={reportDesignSettings}
          isPdfGeneration={isPdfGeneration}
          onReadyForPdf={onReadyForPdf}
        />
      </div>
      <div style={{ pageBreakBefore: "always" }} />
      <BulkPayslipsRenderer
        payslips={payslips}
        getEmployeeName={getEmployeeName}
        payslipDesignSettings={payslipDesignSettings}
        companyDetails={companyDetails}
        employees={employees}
        isPdfGeneration={isPdfGeneration}
      />
    </div>
  );
};

export default BulkPayslipsWithReportsRenderer;