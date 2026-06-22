import { computeSetupReadyCount } from "@/lib/dashboard-admin-summary";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { PayCycleSettings } from "@/integrations/supabase/pay-cycle-queries";
import type { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";

export type HealthStatus = "ok" | "warning" | "critical" | "info";

export interface SystemHealthCheck {
  key: string;
  title: string;
  status: HealthStatus;
  message: string;
  actionUrl?: string;
}

export interface SystemHealthReport {
  overall: HealthStatus;
  readyCount: number;
  totalChecks: number;
  checks: SystemHealthCheck[];
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.every((s) => s === "info")) return "info";
  return "ok";
}

export function buildSystemHealthReport(input: {
  companyDetails: MockCompanyDetails | null;
  payCycleSettings: PayCycleSettings | null;
  userTaxSettings: UserTaxSettings | null;
  taxTables: { payeBrackets?: unknown[] } | null;
  pendingTodoCount: number;
  criticalTodoCount: number;
  timesheetsAwaitingAction: number;
  employeeCount: number;
  payslipCount: number;
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isCoreDataLoading: boolean;
  activeTaxYearForCalculations: string | number;
}): SystemHealthReport {
  const setupReadyCount = computeSetupReadyCount({
    companyDetails: input.companyDetails,
    payCycleSettings: input.payCycleSettings,
    userTaxSettings: input.userTaxSettings,
    taxTables: input.taxTables,
  });
  const setupTotal = 3;

  const checks: SystemHealthCheck[] = [
    {
      key: "setup",
      title: "Payroll setup",
      status:
        setupReadyCount === setupTotal
          ? "ok"
          : setupReadyCount === 0
            ? "critical"
            : "warning",
      message:
        setupReadyCount === setupTotal
          ? "Company, pay cycle, and tax configuration are ready."
          : `${setupReadyCount}/${setupTotal} setup areas complete.`,
      actionUrl: "/settings/company-details",
    },
    {
      key: "data-mode",
      title: "Data source",
      status: input.isMockDataEnabled ? "info" : input.isAuthenticated ? "ok" : "warning",
      message: input.isMockDataEnabled
        ? "Mock data mode — analytics reflect local sample data."
        : input.isAuthenticated
          ? "Live Supabase data connected for this session."
          : "Sign in to load live payroll data.",
    },
    {
      key: "workforce",
      title: "Workforce records",
      status: input.employeeCount > 0 ? "ok" : "warning",
      message:
        input.employeeCount > 0
          ? `${input.employeeCount} employee record${input.employeeCount === 1 ? "" : "s"} loaded.`
          : "No employees loaded — add staff before running payroll.",
      actionUrl: "/employees",
    },
    {
      key: "payroll-history",
      title: "Payroll history",
      status: input.payslipCount > 0 ? "ok" : "warning",
      message:
        input.payslipCount > 0
          ? `${input.payslipCount} payslip${input.payslipCount === 1 ? "" : "s"} available for trends.`
          : "No payslips yet — run payroll to populate analytics.",
      actionUrl: "/payroll/runs",
    },
    {
      key: "tasks",
      title: "Open to-dos",
      status:
        input.criticalTodoCount > 0
          ? "critical"
          : input.pendingTodoCount > 0
            ? "warning"
            : "ok",
      message:
        input.criticalTodoCount > 0
          ? `${input.criticalTodoCount} critical task${input.criticalTodoCount === 1 ? "" : "s"} need attention.`
          : input.pendingTodoCount > 0
            ? `${input.pendingTodoCount} pending task${input.pendingTodoCount === 1 ? "" : "s"} in queue.`
            : "No pending payroll tasks.",
      actionUrl: "/to-dos",
    },
    {
      key: "timesheets",
      title: "Timesheet workflow",
      status: input.timesheetsAwaitingAction > 0 ? "warning" : "ok",
      message:
        input.timesheetsAwaitingAction > 0
          ? `${input.timesheetsAwaitingAction} timesheet${input.timesheetsAwaitingAction === 1 ? "" : "s"} awaiting approval or submission.`
          : "No draft or submitted timesheets blocking payroll.",
      actionUrl: "/timesheet",
    },
    {
      key: "tax-year",
      title: "Tax year",
      status: "info",
      message: `Statutory calculations use tax year ${input.activeTaxYearForCalculations}.`,
      actionUrl: "/settings/tax-liabilities",
    },
  ];

  if (input.isCoreDataLoading) {
    checks.unshift({
      key: "loading",
      title: "Data refresh",
      status: "info",
      message: "Core payroll datasets are still loading.",
    });
  }

  const actionable = checks.filter((c) => c.key !== "tax-year" && c.key !== "loading");
  const readyCount = actionable.filter((c) => c.status === "ok").length;

  return {
    overall: worstStatus(checks.map((c) => c.status)),
    readyCount,
    totalChecks: actionable.length,
    checks,
  };
}
