"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Scale, CalendarDays, Clock, Building2, Banknote, UserPlus, Users, Wallet, ScrollText } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import ReportPreviewDialog from "./ReportPreviewDialog";
import {
  generatePayrollSummaryReportContent,
  generateEmployeePayslipReportContent,
  generateTaxStatutoryReportContent,
  generateLeaveAbsenceReportContent,
  generateOvertimeBonusReportContent,
  generateDepartmentalCostReportContent,
  generateBankTransferReportContent,
  generateNewHiresTerminationsReportContent,
  generateEmployeeDemographicsReportContent,
  generateBenefitDeductionsReportContent,
  generateAuditTrailReportContent,
} from "@/lib/report-generators";
import { MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces"; // Import MockCompanyDetails

interface ReportItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onGenerate: (reportTitle: string, reportContent: string, documentType: 'payslip' | 'report') => void; // Added documentType
  reportContentGenerator: (employees: MockEmployee[], payslips: MockPayslip[], leaveRecords: LeaveEntry[]) => string;
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
}

const ReportItem: React.FC<ReportItemProps> = ({
  icon: Icon,
  title,
  description,
  onGenerate,
  reportContentGenerator,
  employees,
  payslips,
  leaveRecords,
}) => {
  const handleGenerateClick = () => {
    const content = reportContentGenerator(employees, payslips, leaveRecords);
    onGenerate(title, content, 'report'); // Pass 'report' as documentType
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <Icon className="h-6 w-6 text-primary" />
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="text-sm text-muted-foreground mb-4">
          {description}
        </CardDescription>
        <Button onClick={handleGenerateClick} variant="outline" className="w-full">
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
};

interface CorePayrollReportsSectionProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  companyDetails: MockCompanyDetails | null; // Receive companyDetails as prop
  reportDesignSettings: ReportDesignSettings; // Prop for report design settings
}

const CorePayrollReportsSection: React.FC<CorePayrollReportsSectionProps> = ({
  employees,
  payslips,
  leaveRecords,
  companyDetails, // Destructure companyDetails
  reportDesignSettings, // Destructure reportDesignSettings
}) => {
  const [isReportPreviewOpen, setIsReportPreviewOpen] = React.useState(false);
  const [currentReportTitle, setCurrentReportTitle] = React.useState("");
  const [currentReportContent, setCurrentReportContent] = React.useState("");
  const [currentDocumentType, setCurrentDocumentType] = React.useState<'payslip' | 'report'>('report'); // New state for document type

  const handleOpenReportPreview = (title: string, content: string, documentType: 'payslip' | 'report') => {
    setCurrentReportTitle(title);
    setCurrentReportContent(content);
    setCurrentDocumentType(documentType); // Set document type
    setIsReportPreviewOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Core Payroll Reports</CardTitle>
          <CardDescription>
            Access foundational reports for compliance, audits, and HR operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ReportItem
              icon={DollarSign}
              title="Payroll Summary Report"
              description="Overview of total salaries, deductions, and net pay per pay period."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generatePayrollSummaryReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={FileText}
              title="Employee Payslip Report"
              description="Individual breakdowns showing gross pay, deductions, benefits, and net pay."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generateEmployeePayslipReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={Scale}
              title="Tax and Statutory Reports"
              description="Includes PAYE, UIF, SDL, and other local tax obligations—critical for SARS compliance."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generateTaxStatutoryReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={CalendarDays}
              title="Leave and Absence Report"
              description="Tracks annual leave, sick leave, and unpaid leave balances."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps, lvs) => generateLeaveAbsenceReportContent(lvs, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={Clock}
              title="Overtime and Bonus Report"
              description="Details extra hours worked and incentive payouts."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generateOvertimeBonusReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={Building2}
              title="Departmental Cost Report"
              description="Shows payroll expenses by department or cost center—great for budgeting."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generateDepartmentalCostReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={Banknote}
              title="Bank Transfer Report"
              description="Lists payment instructions for salary disbursement."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generateBankTransferReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            {/* Additional Reports */}
            <ReportItem
              icon={UserPlus}
              title="New Hires & Terminations Report"
              description="Tracks employee onboarding and offboarding activities."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps) => generateNewHiresTerminationsReportContent(emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={Users}
              title="Employee Demographics Report"
              description="Provides insights into workforce composition by job title and salary range."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps) => generateEmployeeDemographicsReportContent(emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={Wallet}
              title="Benefit Deductions Report"
              description="Detailed breakdown of non-statutory benefit deductions."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(emps, pslps) => generateBenefitDeductionsReportContent(pslps, emps)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
            <ReportItem
              icon={ScrollText}
              title="Audit Trail Report"
              description="Logs significant system actions and changes for security and compliance."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={() => generateAuditTrailReportContent()}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
            />
          </div>
        </CardContent>
      </Card>

      <ReportPreviewDialog
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportTitle={currentReportTitle}
        reportContent={currentReportContent}
        companyDetails={companyDetails} // Pass companyDetails directly
        reportDesignSettings={reportDesignSettings}
        documentType={currentDocumentType} // Pass document type to dialog
      />
    </>
  );
};

export default CorePayrollReportsSection;