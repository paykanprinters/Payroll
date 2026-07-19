import { endOfMonth, endOfYear, parseISO, startOfMonth, startOfYear } from "date-fns";
import type { MockCompanyDetails, MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import type { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import type { TaxTables } from "@/hooks/use-tax-tables";
import {
  getTaxTableBlockingMessage,
  validateLoadedTaxTables,
} from "@/lib/tax-tables-validation";

export type ReadinessSeverity = "critical" | "warning";

export type ReadinessIssueCode =
  | "missing_personal_id"
  | "missing_id_number"
  | "missing_phone"
  | "missing_tax_reference"
  | "missing_bank_name"
  | "missing_bank_account_holder"
  | "missing_account_number"
  | "missing_branch_code"
  | "missing_company_tax_number"
  | "tax_tables"
  | "missing_timesheet"
  | "draft_timesheet"
  | "unapproved_timesheet";

export type ReadinessIssue = {
  code: ReadinessIssueCode;
  label: string;
  severity: ReadinessSeverity;
};

export type EmployeeReadinessRow = {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  jobTitle: string;
  issues: ReadinessIssue[];
  status: "ready" | "blocked" | "attention";
};

export type CompanyReadinessIssue = ReadinessIssue;

export type PayrollReadinessAssessment = {
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  companyIssues: CompanyReadinessIssue[];
  employees: EmployeeReadinessRow[];
  totals: {
    employeeCount: number;
    readyCount: number;
    blockedCount: number;
    attentionCount: number;
    criticalIssueCount: number;
    warningIssueCount: number;
  };
};

/** Shared profile checklist for To-Dos and the readiness report. */
export const PROFILE_FIELD_CHECKS: Array<{
  key: keyof MockEmployee;
  code: ReadinessIssueCode;
  label: string;
  severity: ReadinessSeverity;
  /** Include in payroll-run blockers (not only report/todos). */
  blocksPayrollRun?: boolean;
}> = [
  {
    key: "personalId",
    code: "missing_personal_id",
    label: "Clock / biometric ID",
    severity: "critical",
  },
  {
    key: "idNumber",
    code: "missing_id_number",
    label: "National ID number",
    severity: "critical",
  },
  {
    key: "taxReferenceNumber",
    code: "missing_tax_reference",
    label: "Tax reference number",
    severity: "critical",
    blocksPayrollRun: true,
  },
  {
    key: "accountNumber",
    code: "missing_account_number",
    label: "Bank account number",
    severity: "critical",
    blocksPayrollRun: true,
  },
  {
    key: "branchCode",
    code: "missing_branch_code",
    label: "Bank branch code",
    severity: "critical",
    blocksPayrollRun: true,
  },
  {
    key: "bankName",
    code: "missing_bank_name",
    label: "Bank name",
    severity: "critical",
    blocksPayrollRun: true,
  },
  {
    key: "bankAccountHolder",
    code: "missing_bank_account_holder",
    label: "Bank account holder",
    severity: "critical",
    blocksPayrollRun: true,
  },
  {
    key: "phoneNumber",
    code: "missing_phone",
    label: "Mobile number",
    severity: "warning",
  },
];

export type ReadinessBlockerType =
  | "BANK_INFO"
  | "EMPLOYEE_TAX_INFO"
  | "COMPANY_TAX_INFO"
  | "TIMESHEET_DRAFT"
  | "TIMESHEET_SUBMITTED"
  | "MISSING_TIMESHEET"
  | "TAX_TABLES";

export type ReadinessBlocker = {
  type: ReadinessBlockerType;
  employeeId?: string;
  message: string;
  severity: "error" | "warning";
  meta?: {
    missingFields?: string[];
    periodStart?: string;
    periodEnd?: string;
  };
};

const TIMESHEET_APPROVE_BLOCKER_TYPES: ReadinessBlockerType[] = [
  "MISSING_TIMESHEET",
  "TIMESHEET_DRAFT",
  "TIMESHEET_SUBMITTED",
];

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function isWithinPeriod(dateIso: string, start: Date, end: Date): boolean {
  const date = parseISO(dateIso);
  const periodStart = new Date(start);
  const periodEnd = new Date(end);
  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(23, 59, 59, 999);
  return date >= periodStart && date <= periodEnd;
}

function resolvePeriod(
  selectedDate: Date | undefined,
  periodType: "monthly" | "yearly"
): { start: Date | null; end: Date | null; label: string } {
  if (!selectedDate) {
    return { start: null, end: null, label: "All periods" };
  }
  if (periodType === "yearly") {
    return {
      start: startOfYear(selectedDate),
      end: endOfYear(selectedDate),
      label: selectedDate.getFullYear().toString(),
    };
  }
  return {
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate),
    label: selectedDate.toLocaleString("en-ZA", { month: "long", year: "numeric" }),
  };
}

function assessEmployeeProfile(employee: MockEmployee): ReadinessIssue[] {
  const ignored = new Set(employee.ignoredIncompleteFields || []);
  const issues: ReadinessIssue[] = [];

  for (const check of PROFILE_FIELD_CHECKS) {
    if (ignored.has(check.key)) continue;
    if (isBlank(employee[check.key])) {
      issues.push({ code: check.code, label: check.label, severity: check.severity });
    }
  }

  return issues;
}

function assessEmployeeTimesheets(
  employeeId: string,
  timesheets: TimesheetEntry[],
  periodStart: Date | null,
  periodEnd: Date | null
): ReadinessIssue[] {
  if (!periodStart || !periodEnd) return [];

  const inPeriod = timesheets.filter(
    (entry) => entry.employeeId === employeeId && isWithinPeriod(entry.date, periodStart, periodEnd)
  );

  if (inPeriod.length === 0) {
    return [
      {
        code: "missing_timesheet",
        label: "No timesheets in period",
        severity: "warning",
      },
    ];
  }

  const issues: ReadinessIssue[] = [];
  if (inPeriod.some((entry) => entry.status === "Draft")) {
    issues.push({
      code: "draft_timesheet",
      label: "Draft timesheets still open",
      severity: "warning",
    });
  }
  if (inPeriod.some((entry) => entry.status === "Submitted")) {
    issues.push({
      code: "unapproved_timesheet",
      label: "Submitted timesheets awaiting approval",
      severity: "warning",
    });
  }
  return issues;
}

function rowStatus(issues: ReadinessIssue[]): EmployeeReadinessRow["status"] {
  if (issues.some((issue) => issue.severity === "critical")) return "blocked";
  if (issues.length > 0) return "attention";
  return "ready";
}

export function assessPayrollReadiness(options: {
  employees: MockEmployee[];
  companyDetails?: MockCompanyDetails | null;
  timesheets?: TimesheetEntry[];
  selectedDate?: Date;
  periodType?: "monthly" | "yearly";
}): PayrollReadinessAssessment {
  const periodType = options.periodType ?? "monthly";
  const { start, end, label } = resolvePeriod(options.selectedDate, periodType);
  const timesheets = options.timesheets ?? [];

  const companyIssues: CompanyReadinessIssue[] = [];
  if (isBlank(options.companyDetails?.companyTaxNumber)) {
    companyIssues.push({
      code: "missing_company_tax_number",
      label: "Company tax number (required when PAYE applies)",
      severity: "critical",
    });
  }

  const employees = [...options.employees]
    .map((employee) => {
      const issues = [
        ...assessEmployeeProfile(employee),
        ...assessEmployeeTimesheets(employee.id, timesheets, start, end),
      ];
      return {
        employeeId: employee.id,
        employeeCode: employee.customEmployeeId || employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        department: employee.department || "—",
        jobTitle: employee.jobTitle || "—",
        issues,
        status: rowStatus(issues),
      } satisfies EmployeeReadinessRow;
    })
    .sort((a, b) => {
      const rank = { blocked: 0, attention: 1, ready: 2 } as const;
      if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
      return a.name.localeCompare(b.name);
    });

  const criticalIssueCount =
    companyIssues.filter((issue) => issue.severity === "critical").length +
    employees.reduce(
      (sum, row) => sum + row.issues.filter((issue) => issue.severity === "critical").length,
      0
    );
  const warningIssueCount =
    companyIssues.filter((issue) => issue.severity === "warning").length +
    employees.reduce(
      (sum, row) => sum + row.issues.filter((issue) => issue.severity === "warning").length,
      0
    );

  return {
    periodLabel: label,
    periodStart: start ? start.toISOString().slice(0, 10) : null,
    periodEnd: end ? end.toISOString().slice(0, 10) : null,
    companyIssues,
    employees,
    totals: {
      employeeCount: employees.length,
      readyCount: employees.filter((row) => row.status === "ready").length,
      blockedCount: employees.filter((row) => row.status === "blocked").length,
      attentionCount: employees.filter((row) => row.status === "attention").length,
      criticalIssueCount,
      warningIssueCount,
    },
  };
}

function missingBankFields(employee: MockEmployee): string[] {
  const missing: string[] = [];
  if (isBlank(employee.bankName)) missing.push("bankName");
  if (isBlank(employee.bankAccountHolder)) missing.push("bankAccountHolder");
  if (isBlank(employee.accountNumber)) missing.push("accountNumber");
  if (isBlank(employee.branchCode)) missing.push("branchCode");
  return missing;
}

/** Canonical payroll-run blockers used by run detail and approve/generate gates. */
export function computePayrollRunBlockers(options: {
  employees: MockEmployee[];
  timesheets: TimesheetEntry[];
  companyDetails: MockCompanyDetails | null;
  userTaxSettings: UserTaxSettings | null;
  periodStart: Date;
  periodEnd: Date;
  taxTables?: TaxTables | null;
  activeTaxYear?: number;
}): ReadinessBlocker[] {
  const {
    employees,
    timesheets,
    companyDetails,
    userTaxSettings,
    periodStart,
    periodEnd,
    taxTables = null,
    activeTaxYear = new Date().getFullYear(),
  } = options;

  const blockers: ReadinessBlocker[] = [];
  const applyPAYE = userTaxSettings?.applyPaye ?? false;
  const periodMeta = {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
  };

  if (applyPAYE && isBlank(companyDetails?.companyTaxNumber)) {
    blockers.push({
      type: "COMPANY_TAX_INFO",
      severity: "error",
      message: "Company tax number is missing (required when PAYE applies).",
    });
  }

  if (applyPAYE) {
    const taxValidation = validateLoadedTaxTables(taxTables, activeTaxYear);
    if (!taxValidation.isReady) {
      blockers.push({
        type: "TAX_TABLES",
        severity: taxValidation.status === "stale" ? "warning" : "error",
        message:
          getTaxTableBlockingMessage(taxValidation) ??
          `Tax tables for ${activeTaxYear} are not ready for payroll.`,
      });
    }
  }

  for (const employee of employees) {
    const missingBank = missingBankFields(employee);
    if (missingBank.length > 0) {
      blockers.push({
        type: "BANK_INFO",
        employeeId: employee.id,
        severity: "error",
        message: `Missing bank info for ${employee.firstName} ${employee.lastName}`,
        meta: { missingFields: missingBank },
      });
    }

    if (applyPAYE && isBlank(employee.taxReferenceNumber)) {
      blockers.push({
        type: "EMPLOYEE_TAX_INFO",
        employeeId: employee.id,
        severity: "error",
        message: `Missing tax reference number for ${employee.firstName} ${employee.lastName}`,
        meta: { missingFields: ["taxReferenceNumber"] },
      });
    }

    const timesheetIssues = assessEmployeeTimesheets(employee.id, timesheets, periodStart, periodEnd);
    for (const issue of timesheetIssues) {
      if (issue.code === "missing_timesheet") {
        blockers.push({
          type: "MISSING_TIMESHEET",
          employeeId: employee.id,
          severity: "warning",
          message: `No timesheets in period for ${employee.firstName} ${employee.lastName}`,
          meta: periodMeta,
        });
      } else if (issue.code === "draft_timesheet") {
        blockers.push({
          type: "TIMESHEET_DRAFT",
          employeeId: employee.id,
          severity: "warning",
          message: `Draft timesheets present for ${employee.firstName} ${employee.lastName}`,
          meta: periodMeta,
        });
      } else if (issue.code === "unapproved_timesheet") {
        blockers.push({
          type: "TIMESHEET_SUBMITTED",
          employeeId: employee.id,
          severity: "warning",
          message: `Submitted timesheets awaiting approval for ${employee.firstName} ${employee.lastName}`,
          meta: periodMeta,
        });
      }
    }
  }

  return blockers;
}

/** Generate items: block only on error-severity blockers. */
export function canGeneratePayrollItems(blockers: ReadinessBlocker[]): boolean {
  return blockers.every((blocker) => blocker.severity !== "error");
}

/**
 * Approve run: block on errors or timesheet warnings so payslip calc cannot
 * silently skip Draft/Submitted/missing attendance.
 */
export function canApprovePayrollRun(blockers: ReadinessBlocker[]): boolean {
  return blockers.every((blocker) => {
    if (blocker.severity === "error") return false;
    if (TIMESHEET_APPROVE_BLOCKER_TYPES.includes(blocker.type)) return false;
    return true;
  });
}

export function buildReminderPayload(blockers: ReadinessBlocker[]) {
  const perEmp = new Map<string, string[]>();
  blockers.forEach((blocker) => {
    if (!blocker.employeeId) return;
    const arr = perEmp.get(blocker.employeeId) || [];
    arr.push(blocker.message);
    perEmp.set(blocker.employeeId, arr);
  });
  return Array.from(perEmp.entries()).map(([employeeId, messages]) => ({
    employeeId,
    messages,
  }));
}

export function isPastCutOff(periodEnd: Date): boolean {
  return Date.now() > periodEnd.getTime();
}
