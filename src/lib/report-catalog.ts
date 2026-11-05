import type { LeaveEntry, MockCompanyDetails, MockEmployee, MockPayslip, TimesheetEntry } from "@/lib/mock-data-interfaces";
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
  generatePayrollReadinessReportContent,
  generatePayrollSummaryReportContent,
  generateTaxStatutoryReportContent,
  generateEmp201ReportContent,
  generateEmp501ReportContent,
  generateEmployeeDeductionsReportContent,
  employeeDeductionsCsv,
  reportPeriodBounds,
  buildPayrollJournal,
  generatePayrollJournalReportContent,
  payrollJournalCsv,
  buildLoanRegister,
  generateLoanRegisterReportContent,
  loanRegisterCsv,
  buildSavingsRegister,
  generateSavingsRegisterReportContent,
  savingsRegisterCsv,
  buildRunApprovals,
  generateRunApprovalsReportContent,
  generateMasterDataChangesReportContent,
  generateUserAccessReportContent,
  userAccessCsv,
} from "@/lib/report-generators";
import { getReportPeriodLabel } from "@/lib/reports-admin-summary";
import { DEFAULT_JOURNAL_ACCOUNTS } from "@/lib/accountant-report-data";
import { format } from "date-fns";

export type ReportCategoryId = "payroll" | "statutory" | "hr" | "finance" | "compliance";

export const REPORT_CATEGORY_LABELS: Record<ReportCategoryId, string> = {
  payroll: "Payroll & payslips",
  statutory: "Statutory & tax",
  hr: "HR & workforce",
  finance: "Finance & payments",
  compliance: "Compliance & audit",
};

export type AccountantSectionId = "payroll" | "statutory" | "people" | "evidence";

export const ACCOUNTANT_SECTION_LABELS: Record<AccountantSectionId, string> = {
  payroll: "Payroll & ledgers",
  statutory: "Statutory & tax",
  people: "People",
  evidence: "Evidence & controls",
};

import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";
import type { AccountantExtraData } from "@/lib/accountant-report-data";

export interface ReportGenerateContext {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  /** Full payslip set before period pre-filter (needed for SA fiscal-year statutory reports). */
  allPayslips?: MockPayslip[];
  leaveRecords: LeaveEntry[];
  /** Timesheets for period readiness (payroll readiness report). */
  timesheets?: TimesheetEntry[];
  selectedDate: Date | undefined;
  periodType: ReportPeriodType;
  auditLevel: ReportAuditLevel;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  /** Live audit log rows from Supabase (audit trail report). */
  auditLogs?: AuditLogEntry[];
  /** Loans, savings plans, runs, users and journal codes; loaded by the report library. */
  extra?: AccountantExtraData;
}

export interface ReportCatalogItem {
  id: string;
  category: ReportCategoryId;
  /** Where the report appears in the Accountant portal; reports without one are hidden there. */
  accountantSection?: AccountantSectionId;
  title: string;
  description: string;
  confidentiality?: "standard" | "sensitive" | "statutory";
  periodTypes: ReportPeriodType[];
  requiresPayslips?: boolean;
  supportsAuditLevel?: boolean;
  externalHref?: string;
  externalLabel?: string;
  generate?: (ctx: ReportGenerateContext) => string;
  csv?: (ctx: ReportGenerateContext) => { filename: string; content: string } | null;
}

/** For reports that only offer monthly and yearly views; they are hidden in the weekly view. */
const monthOrYear = (ctx: ReportGenerateContext): "monthly" | "yearly" =>
  ctx.periodType === "yearly" ? "yearly" : "monthly";

const sourcePayslips = (ctx: ReportGenerateContext) => ctx.allPayslips ?? ctx.payslips;
const boundsFor = (ctx: ReportGenerateContext) =>
  reportPeriodBounds(sourcePayslips(ctx), ctx.selectedDate, ctx.periodType);
const labelFor = (ctx: ReportGenerateContext) =>
  getReportPeriodLabel(ctx.selectedDate, ctx.periodType, sourcePayslips(ctx));
const stampFor = (ctx: ReportGenerateContext) =>
  ctx.selectedDate
    ? format(
        ctx.selectedDate,
        ctx.periodType === "yearly" ? "yyyy" : ctx.periodType === "weekly" ? "yyyy-MM-dd" : "yyyy-MM"
      )
    : "all";
const journalFor = (ctx: ReportGenerateContext) =>
  buildPayrollJournal(
    sourcePayslips(ctx),
    ctx.selectedDate,
    ctx.periodType,
    ctx.extra?.journalAccounts ?? DEFAULT_JOURNAL_ACCOUNTS
  );
const savingsFor = (ctx: ReportGenerateContext) =>
  buildSavingsRegister(ctx.extra?.savingPlans ?? [], sourcePayslips(ctx), ctx.employees, boundsFor(ctx));

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: "payroll-readiness",
    category: "payroll",
    title: "Payroll readiness",
    description:
      "Stakeholder checklist of missing employee and company data, plus period timesheet gaps that can block a clean payroll run.",
    confidentiality: "sensitive",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generatePayrollReadinessReportContent(
        ctx.employees,
        ctx.companyDetails,
        ctx.timesheets,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "payroll-summary",
    category: "payroll",
    accountantSection: "payroll",
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
        monthOrYear(ctx),
        ctx.auditLevel
      ),
  },
  {
    id: "employee-payslip-register",
    category: "payroll",
    accountantSection: "payroll",
    title: "Payslip register",
    description: "Line-by-line payslip listing per employee for audit and reconciliation.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateEmployeePayslipReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "tax-statutory",
    category: "statutory",
    accountantSection: "statutory",
    title: "Tax & statutory deductions",
    description: "PAYE, UIF, and SDL totals with employee-level statutory breakdown.",
    confidentiality: "statutory",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateTaxStatutoryReportContent(
        ctx.periodType === "yearly" ? (ctx.allPayslips ?? ctx.payslips) : ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "employee-deductions",
    category: "statutory",
    accountantSection: "statutory",
    title: "Employee deductions for the accountant",
    description:
      "PAYE, UIF, loan repayments and savings per employee, with gross, net, and loan and savings balances.",
    confidentiality: "sensitive",
    periodTypes: ["weekly", "monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateEmployeeDeductionsReportContent(
        ctx.periodType === "yearly" ? (ctx.allPayslips ?? ctx.payslips) : ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      ),
    csv: (ctx) => {
      const content = employeeDeductionsCsv(
        ctx.periodType === "yearly" ? (ctx.allPayslips ?? ctx.payslips) : ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        ctx.periodType
      );
      if (!content) return null;
      const stamp = ctx.selectedDate
        ? format(
            ctx.selectedDate,
            ctx.periodType === "yearly" ? "yyyy" : ctx.periodType === "weekly" ? "yyyy-MM-dd" : "yyyy-MM"
          )
        : "all";
      return { filename: `employee-deductions-${stamp}.csv`, content };
    },
  },
  {
    id: "emp201",
    category: "statutory",
    accountantSection: "statutory",
    title: "EMP201 monthly declaration",
    description: "Monthly PAYE, SDL, and UIF (2%) totals payable to SARS, with the amount due.",
    confidentiality: "statutory",
    periodTypes: ["monthly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateEmp201ReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "emp501",
    category: "statutory",
    accountantSection: "statutory",
    title: "EMP501 reconciliation",
    description:
      "Annual reconciliation of monthly EMP201 declarations against year-end IRP5 / IT3(a) certificate totals, with PAYE and UIF difference checks.",
    confidentiality: "statutory",
    periodTypes: ["yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateEmp501ReportContent(
        ctx.allPayslips ?? ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx),
        ctx.companyDetails
      ),
  },
  {
    id: "irp5-export",
    category: "statutory",
    accountantSection: "statutory",
    title: "IRP5 / IT3(a) export",
    description:
      "Year-end employee tax certificates with SARS source codes (3601, 4102, 4116, 4141, etc.) plus a bulk e@syFile CSV for all employees. Configure in Tax settings, then export from Payslips.",
    confidentiality: "statutory",
    periodTypes: ["yearly"],
    externalHref: "/payslips/irp5-export",
    externalLabel: "Open IRP5 export",
  },
  {
    id: "leave-absence",
    category: "hr",
    accountantSection: "people",
    title: "Leave & absence",
    description: "Working days taken by type, employee, and date range.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generateLeaveAbsenceReportContent(
        ctx.leaveRecords,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "overtime-bonus",
    category: "payroll",
    accountantSection: "payroll",
    title: "Overtime & bonus",
    description: "Premium pay and bonus lines extracted from payslip earnings.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateOvertimeBonusReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "departmental-cost",
    category: "hr",
    accountantSection: "people",
    title: "Departmental cost",
    description: "Payroll cost grouped by department for budget review.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateDepartmentalCostReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "new-hires-terminations",
    category: "hr",
    accountantSection: "people",
    title: "New hires & terminations",
    description: "Onboarding and separation activity within the reporting period.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generateNewHiresTerminationsReportContent(ctx.employees, ctx.selectedDate, monthOrYear(ctx)),
  },
  {
    id: "employee-demographics",
    category: "hr",
    accountantSection: "people",
    title: "Employee demographics",
    description: "Headcount by department, job title, and pay basis.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) =>
      generateEmployeeDemographicsReportContent(ctx.employees, ctx.selectedDate, monthOrYear(ctx)),
  },
  {
    id: "bank-transfer",
    category: "finance",
    accountantSection: "payroll",
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
        monthOrYear(ctx)
      ),
  },
  {
    id: "benefit-deductions",
    category: "finance",
    accountantSection: "payroll",
    title: "Benefit deductions",
    description: "Non-statutory deductions such as loans, savings, and benefits.",
    periodTypes: ["monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) =>
      generateBenefitDeductionsReportContent(
        ctx.payslips,
        ctx.employees,
        ctx.selectedDate,
        monthOrYear(ctx)
      ),
  },
  {
    id: "audit-trail",
    category: "compliance",
    accountantSection: "evidence",
    title: "Audit trail",
    description: "High-level log of payroll-related system events for the period.",
    periodTypes: ["monthly", "yearly"],
    generate: (ctx) => generateAuditTrailReportContent(ctx.selectedDate, monthOrYear(ctx), ctx.auditLogs),
  },
  {
    id: "payroll-journal",
    category: "finance",
    accountantSection: "payroll",
    title: "Payroll journal",
    description:
      "Debits and credits for wages, employer UIF and SDL, PAYE, UIF and SDL payable, staff loans, savings and net pay, ready to post to the ledger.",
    periodTypes: ["weekly", "monthly", "yearly"],
    requiresPayslips: true,
    generate: (ctx) => generatePayrollJournalReportContent(journalFor(ctx)),
    csv: (ctx) => {
      const bounds = boundsFor(ctx);
      const content = payrollJournalCsv(journalFor(ctx), bounds?.end ?? format(new Date(), "yyyy-MM-dd"));
      return content ? { filename: `payroll-journal-${stampFor(ctx)}.csv`, content } : null;
    },
  },
  {
    id: "loan-register",
    category: "finance",
    accountantSection: "payroll",
    title: "Staff loan register",
    description: "Every staff loan with amount, repayment terms, status, repayments in the period and balance outstanding.",
    confidentiality: "sensitive",
    periodTypes: ["weekly", "monthly", "yearly"],
    generate: (ctx) =>
      generateLoanRegisterReportContent(
        buildLoanRegister(ctx.extra?.loans ?? [], ctx.employees, boundsFor(ctx)),
        labelFor(ctx)
      ),
    csv: (ctx) => {
      const content = loanRegisterCsv(buildLoanRegister(ctx.extra?.loans ?? [], ctx.employees, boundsFor(ctx)));
      return content ? { filename: `loan-register-${stampFor(ctx)}.csv`, content } : null;
    },
  },
  {
    id: "savings-register",
    category: "finance",
    accountantSection: "payroll",
    title: "Staff savings register",
    description: "Savings plans, contributions deducted in the period and the balance held for each employee.",
    confidentiality: "sensitive",
    periodTypes: ["weekly", "monthly", "yearly"],
    generate: (ctx) =>
      generateSavingsRegisterReportContent(savingsFor(ctx), labelFor(ctx)),
    csv: (ctx) => {
      const content = savingsRegisterCsv(savingsFor(ctx));
      return content ? { filename: `savings-register-${stampFor(ctx)}.csv`, content } : null;
    },
  },
  {
    id: "run-approvals",
    category: "compliance",
    accountantSection: "evidence",
    title: "Payroll run approvals",
    description: "Who created, reviewed, approved, locked and paid each payroll run, with segregation-of-duties checks.",
    periodTypes: ["weekly", "monthly", "yearly"],
    generate: (ctx) =>
      generateRunApprovalsReportContent(
        buildRunApprovals(ctx.extra?.payrollRuns ?? [], ctx.extra?.users ?? [], boundsFor(ctx)),
        labelFor(ctx)
      ),
  },
  {
    id: "master-data-changes",
    category: "compliance",
    accountantSection: "evidence",
    title: "Master data changes",
    description: "Changes to employee records, users and company or payroll settings, with who made them and when.",
    periodTypes: ["weekly", "monthly", "yearly"],
    generate: (ctx) => generateMasterDataChangesReportContent(ctx.auditLogs ?? [], labelFor(ctx)),
  },
  {
    id: "user-access",
    category: "compliance",
    accountantSection: "evidence",
    title: "User access list",
    description: "Everyone with a login, their role, status, access end date and last sign-in.",
    periodTypes: ["weekly", "monthly", "yearly"],
    generate: (ctx) => generateUserAccessReportContent(ctx.extra?.users ?? []),
    csv: (ctx) => {
      const content = userAccessCsv(ctx.extra?.users ?? []);
      return content ? { filename: `user-access-${format(new Date(), "yyyy-MM-dd")}.csv`, content } : null;
    },
  },
];

export function getReportsByCategory(category: ReportCategoryId | "all") {
  if (category === "all") return REPORT_CATALOG;
  return REPORT_CATALOG.filter((r) => r.category === category);
}
