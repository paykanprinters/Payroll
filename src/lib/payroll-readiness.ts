import { endOfMonth, endOfYear, parseISO, startOfMonth, startOfYear } from "date-fns";
import type { MockCompanyDetails, MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";

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

const PROFILE_CHECKS: Array<{
  key: keyof MockEmployee;
  code: ReadinessIssueCode;
  label: string;
  severity: ReadinessSeverity;
}> = [
  { key: "personalId", code: "missing_personal_id", label: "Clock / biometric ID", severity: "critical" },
  { key: "idNumber", code: "missing_id_number", label: "National ID number", severity: "critical" },
  { key: "taxReferenceNumber", code: "missing_tax_reference", label: "Tax reference number", severity: "critical" },
  { key: "accountNumber", code: "missing_account_number", label: "Bank account number", severity: "critical" },
  { key: "branchCode", code: "missing_branch_code", label: "Bank branch code", severity: "critical" },
  { key: "bankName", code: "missing_bank_name", label: "Bank name", severity: "critical" },
  { key: "bankAccountHolder", code: "missing_bank_account_holder", label: "Bank account holder", severity: "critical" },
  { key: "phoneNumber", code: "missing_phone", label: "Mobile number", severity: "warning" },
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

  for (const check of PROFILE_CHECKS) {
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
