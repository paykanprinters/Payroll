import type { LeaveEntry, MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import type { ReportAuditLevel, ReportPeriodType } from "@/lib/reports-admin-summary";
import {
  generateAuditTrailReportContent,
  generateBankTransferReportContent,
  generateBenefitDeductionsReportContent,
  generateDepartmentalCostReportContent,
  generateEmployeeDemographicsReportContent,
  generateEmployeePayslipReportContent,
  generateLeaveAbsenceReportContent,
  generateNewHiresTerminationsReportContent,
  generateOvertimeBonusReportContent,
  generatePayrollSummaryReportContent,
  generateTaxStatutoryReportContent,
} from "@/lib/report-generators";

export type ReportCategoryId = "payroll" | "statutory" | "hr" | "finance" | "compliance";

export const REPORT_CATEGORY_LABELS: Record<ReportCategoryId, string> = {
  payroll: "Payroll & payslips",
  statutory: "Statutory & tax",
  hr: "HR & workforce",
  finance: "Finance & payments",
  compliance: "Compliance & audit",
};

export interface ReportGenerateContext {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  selectedDate: Date | undefined;
  periodType: ReportPeriodType;
  auditLevel: ReportAuditLevel;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
}

export interface ReportCatalogItem {
  id: string;
  category: ReportCategoryId;
  title: string;
  description: string;
  confidentiality?: "standard" | "sensitive" | "statutory";
  periodTypes: ReportPeriodType[];
  requiresPayslips?: boolean;
  supportsAuditLevel?: boolean;
  externalHref?: string;
  externalLabel?: string;
  generate?: (ctx: ReportGenerateContext) => string;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: "payroll-summary",
    category: "payroll",
    title: "Payroll summary",
    description: "Executive totals, deduction breakdown, and pay-period summary for the selected window.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    supportsAuditLevel: true,
    generate: (ctx) =>
      generatePayrollSummaryReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType,
        ctx.auditLevel
      ),
  },
  {
    id: "employee-payslip-register",
    category: "payroll",
    title: "Payslip register",
    description: "Line-by-line payslip listing per employee for audit and reconciliation.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateEmployeePayslipReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "tax-statutory",
    category: "statutory",
    title: "Tax & statutory deductions",
    description: "PAYE, UIF, and SDL totals with employee-level statutory breakdown.",
    confidentiality: "statutory",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateTaxStatutoryReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "irp5-export",
    category: "statutory",
    title: "IRP5 / IT3(a) export",
    description: "Year-end tax certificates per employee. Configure in Tax settings, then export from Payslips.",
    confidentiality: "statutory",
    periodTypes: ["yearly"],
    externalHref: "/payslips/irp5-export",
    externalLabel: "Open IRP5 export",
  },
  {
    id: "leave-absence",
    category: "hr",
    title: "Leave & absence",
    description: "Working days taken by type, employee, and date range.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generateLeaveAbsenceReportContent(
        ctx.leaveRecords,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "overtime-bonus",
    category: "payroll",
    title: "Overtime & bonus",
    description: "Premium pay and bonus lines extracted from payslip earnings.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateOvertimeBonusReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "departmental-cost",
    category: "hr",
    title: "Departmental cost",
    description: "Payroll cost grouped by department for budget review.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateDepartmentalCostReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "new-hires-terminations",
    category: "hr",
    title: "New hires & terminations",
    description: "Onboarding and separation activity within the reporting period.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generateNewHiresTerminationsReportContent(ctx.employees, ctx.selectedDate, ctx.periodType),
  },
  {
    id: "employee-demographics",
    category: "hr",
    title: "Employee demographics",
    description: "Headcount by department, job title, and pay basis.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generateEmployeeDemographicsReportContent(ctx.employees, ctx.selectedDate, ctx.periodType),
  },
  {
    id: "bank-transfer",
    category: "finance",
    title: "Bank transfer schedule",
    description: "Net pay and banking details formatted for salary payment processing.",
    confidentiality: "sensitive",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateBankTransferReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "benefit-deductions",
    category: "finance",
    title: "Benefit deductions",
    description: "Non-statutory deductions such as loans, savings, and benefits.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateBenefitDeductionsReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
  },
  {
    id: "audit-trail",
    category: "compliance",
    title: "Audit trail",
    description: "High-level log of payroll-related system events for the period.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) => generateAuditTrailReportContent(ctx.selectedDate, ctx.periodType),
  },
];

export function getReportsByCategory(category: ReportCategoryId | "all") {
  if (category === "all") return REPORT_CATALOG;
  return REPORT_CATALOG.filter((r) => r.category === category);
}
