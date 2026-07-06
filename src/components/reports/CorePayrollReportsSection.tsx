"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  DollarSign,
  Scale,
  CalendarDays,
  Clock,
  Building2,
  Banknote,
  UserPlus,
  Users,
  Wallet,
  ScrollText,
} from "lucide-react";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

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

import ReportPreviewDialog from "./ReportPreviewDialog";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { MockCompanyDetails, MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data-interfaces";

type ReportContext = {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  selectedDate: Date | undefined;
  periodType: "monthly" | "yearly";
};

interface ReportItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onGenerate: (reportTitle: string, reportContent: string, documentType: "payslip" | "report") => void;
  reportContentGenerator: (ctx: ReportContext) => string;
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  selectedReportDate: Date | undefined;
  reportPeriodType: "monthly" | "yearly";
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
  selectedReportDate,
  reportPeriodType,
}) => {
  const handleGenerateClick = () => {
    const content = reportContentGenerator({
      employees,
      payslips,
      leaveRecords,
      selectedDate: selectedReportDate,
      periodType: reportPeriodType,
    });
    onGenerate(title, content, "report");
  };

  return (
    <Card className="relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      <SummaryAccent variant="emerald" />
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="mb-4 text-sm text-muted-foreground">{description}</CardDescription>
        <Button onClick={handleGenerateClick} variant="outline" className="w-full rounded-full">
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
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  selectedReportDate: Date | undefined;
  reportPeriodType: "monthly" | "yearly";
}

const CorePayrollReportsSection: React.FC<CorePayrollReportsSectionProps> = ({
  employees,
  payslips,
  leaveRecords,
  companyDetails,
  reportDesignSettings,
  selectedReportDate,
  reportPeriodType,
}) => {
  const [isReportPreviewOpen, setIsReportPreviewOpen] = React.useState(false);
  const [currentReportTitle, setCurrentReportTitle] = React.useState("");
  const [currentReportContent, setCurrentReportContent] = React.useState("");
  const [currentDocumentType, setCurrentDocumentType] = React.useState<"payslip" | "report">("report");

  const handleOpenReportPreview = (title: string, content: string, documentType: "payslip" | "report") => {
    setCurrentReportTitle(title);
    setCurrentReportContent(content);
    setCurrentDocumentType(documentType);
    setIsReportPreviewOpen(true);
  };

  return (
    <>
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle>Core Payroll Reports</CardTitle>
          <CardDescription>Access foundational reports for compliance, audits, and HR operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ReportItem
              icon={DollarSign}
              title="Payroll Summary"
              description="Overview of total payroll costs, gross earnings, and net pay for a selected period."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generatePayrollSummaryReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={FileText}
              title="Employee Payslip Report"
              description="Detailed payslip breakdown per employee for a specified period."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateEmployeePayslipReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Scale}
              title="Tax & Statutory Report"
              description="Summary of statutory deductions (PAYE, UIF, SDL) and compliance metrics."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateTaxStatutoryReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={CalendarDays}
              title="Leave & Absence Report"
              description="Tracks leave taken by employees, types of leave, and leave balances."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateLeaveAbsenceReportContent(ctx.leaveRecords, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Clock}
              title="Overtime & Bonus Report"
              description="Highlights overtime and bonus payments over the selected reporting period."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateOvertimeBonusReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Building2}
              title="Departmental Cost Report"
              description="Payroll costs grouped by department for budget planning and analysis."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateDepartmentalCostReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Banknote}
              title="Bank Transfer Report"
              description="Provides a payment file-style summary to assist with bank payment processing."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateBankTransferReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={UserPlus}
              title="New Hires & Terminations"
              description="Tracks employee onboarding and terminations over the reporting period."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) => generateNewHiresTerminationsReportContent(ctx.employees, ctx.selectedDate, ctx.periodType)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Users}
              title="Employee Demographics"
              description="Breakdown of employee data by department, job title, and other demographics."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) => generateEmployeeDemographicsReportContent(ctx.employees, ctx.selectedDate, ctx.periodType)}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={Wallet}
              title="Benefit Deductions"
              description="Summary of benefit-related deductions across employees for the selected period."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) =>
                generateBenefitDeductionsReportContent(ctx.payslips, ctx.employees, ctx.selectedDate, ctx.periodType)
              }
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
            <ReportItem
              icon={ScrollText}
              title="Audit Trail"
              description="High-level audit trail style report for payroll actions and system events."
              onGenerate={handleOpenReportPreview}
              reportContentGenerator={(ctx) => generateAuditTrailReportContent(ctx.selectedDate, ctx.periodType, [])}
              employees={employees}
              payslips={payslips}
              leaveRecords={leaveRecords}
              selectedReportDate={selectedReportDate}
              reportPeriodType={reportPeriodType}
            />
          </div>
        </CardContent>
      </Card>

      <ReportPreviewDialog
        isOpen={isReportPreviewOpen}
        onClose={() => setIsReportPreviewOpen(false)}
        reportTitle={currentReportTitle}
        reportContent={currentReportContent}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        documentType={currentDocumentType}
      />
    </>
  );
};

export default CorePayrollReportsSection;