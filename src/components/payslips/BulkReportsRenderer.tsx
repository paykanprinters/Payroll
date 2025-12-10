"use client";

import React from "react";
import { MockPayslip, MockEmployee, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
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
  isPdfGeneration?: boolean;
  onReadyForPdf?: () => void;
}

const BulkReportsRenderer: React.FC<Props> = ({
  payslips,
  employees,
  companyDetails,
  reportDesignSettings,
  auditLevel,
  selectedDate,
  mode,
  isPdfGeneration = true,
  onReadyForPdf,
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
      <div className="html2pdf__page-break" />
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
      <div className="html2pdf__page-break" />
    </div>
  );
};

export default BulkReportsRenderer;