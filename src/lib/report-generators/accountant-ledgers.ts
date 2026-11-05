import { endOfMonth, format, startOfMonth } from "date-fns";
import type { Loan, MockEmployee, MockPayslip, SavingPlan } from "../mock-data-interfaces";
import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";
import type { PayrollRun } from "@/integrations/supabase/payroll-run-queries";
import {
  JOURNAL_LINE_ORDER,
  type AccessListUser,
  type JournalAccountCodes,
  type JournalLineId,
} from "@/lib/accountant-report-data";
import { payWeekForDate, type ReportPeriodType } from "@/lib/reports-admin-summary";
import { getSarsTaxYearBounds, taxYearFromSelectedDate } from "@/lib/tax-year-period";
import { escapeCsvField } from "./easyfile-export";
import { selectPayslipsForEmployeeDeductions } from "./employee-deductions";

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) =>
  n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const csvText = (s: string) => (/^[=+\-@]/.test(s) ? `'${s}` : s);
const toCsv = (header: string[], rows: string[][]) =>
  `\uFEFF${[header, ...rows].map((r) => r.map(escapeCsvField).join(",")).join("\r\n")}`;
const sumByName = (p: MockPayslip, name: string) =>
  p.deductionsBreakdown.filter((d) => d.name === name).reduce((s, d) => s + d.amount, 0);
const payslipStart = (p: MockPayslip) => p.payPeriod.split(" - ")[0];

const dateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const dateOnly = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const employeeName = (employees: MockEmployee[], id: string) => {
  const e = employees.find((x) => x.id === id);
  return e ? `${e.firstName} ${e.lastName}` : "Unknown employee";
};

const th = (label: string, right = false) =>
  `<th class="py-2 px-3${right ? " text-right" : ""}">${label}</th>`;
const td = (value: string, right = false) =>
  `<td class="py-2 px-3${right ? " text-right" : ""}">${value}</td>`;
const table = (headers: string, body: string) => `
  <table class="w-full text-left border-collapse text-sm">
    <thead><tr class="border-b">${headers}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;

/** First and last day (yyyy-MM-dd) of the selected reporting period. */
export function reportPeriodBounds(
  payslips: MockPayslip[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): { start: string; end: string } | null {
  if (!selectedDate) return null;
  if (periodType === "weekly") {
    const week = payWeekForDate(payslips, selectedDate);
    const day = format(selectedDate, "yyyy-MM-dd");
    return week ? { start: week.start, end: week.end } : { start: day, end: day };
  }
  if (periodType === "yearly") return getSarsTaxYearBounds(taxYearFromSelectedDate(selectedDate));
  return {
    start: format(startOfMonth(selectedDate), "yyyy-MM-dd"),
    end: format(endOfMonth(selectedDate), "yyyy-MM-dd"),
  };
}

const inBounds = (day: string | null | undefined, bounds: { start: string; end: string } | null) =>
  !!day && (!bounds || (day.slice(0, 10) >= bounds.start && day.slice(0, 10) <= bounds.end));

// ---------------------------------------------------------------------------
// Payroll journal
// ---------------------------------------------------------------------------

export interface JournalLine {
  id: JournalLineId;
  code: string;
  name: string;
  debit: number;
  credit: number;
}

export interface PayrollJournal {
  periodDescription: string;
  payslipCount: number;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
}

export function buildPayrollJournal(
  payslips: MockPayslip[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType,
  accounts: JournalAccountCodes
): PayrollJournal {
  const selected = selectPayslipsForEmployeeDeductions(payslips, selectedDate, periodType);
  let gross = 0, paye = 0, uif = 0, sdl = 0, loans = 0, savings = 0, total = 0, net = 0;
  for (const p of selected.payslips) {
    gross += p.grossEarnings || 0;
    paye += sumByName(p, "PAYE");
    uif += sumByName(p, "UIF");
    sdl += p.employerSdl || 0;
    loans += p.loanDeduction ?? sumByName(p, "Loan Repayment");
    savings += sumByName(p, "Savings");
    total += p.totalDeductions || 0;
    net += p.netPay || 0;
  }
  // Employer UIF matches the employee's 1%, as on the EMP201.
  const amounts: Record<JournalLineId, { debit: number; credit: number }> = {
    salariesExpense: { debit: gross, credit: 0 },
    employerUifExpense: { debit: uif, credit: 0 },
    sdlExpense: { debit: sdl, credit: 0 },
    payePayable: { debit: 0, credit: paye },
    uifPayable: { debit: 0, credit: uif * 2 },
    sdlPayable: { debit: 0, credit: sdl },
    staffLoans: { debit: 0, credit: loans },
    staffSavings: { debit: 0, credit: savings },
    otherDeductionsPayable: { debit: 0, credit: total - paye - uif - loans - savings },
    netPayPayable: { debit: 0, credit: net },
  };
  const lines = JOURNAL_LINE_ORDER.map((id) => ({
    id,
    code: accounts[id].code,
    name: accounts[id].name,
    debit: round2(amounts[id].debit),
    credit: round2(amounts[id].credit),
  })).filter((l) => l.debit !== 0 || l.credit !== 0);
  return {
    periodDescription: selected.periodDescription,
    payslipCount: selected.payslips.length,
    lines,
    totalDebit: round2(lines.reduce((s, l) => s + l.debit, 0)),
    totalCredit: round2(lines.reduce((s, l) => s + l.credit, 0)),
  };
}

export function generatePayrollJournalReportContent(journal: PayrollJournal): string {
  if (journal.payslipCount === 0) {
    return `<p>No payslip data available for ${journal.periodDescription} to build a journal.</p>`;
  }
  const missingCodes = journal.lines.some((l) => !l.code);
  const body = journal.lines
    .map(
      (l) => `<tr class="border-b">${td(escapeHtml(l.code || "—"))}${td(escapeHtml(l.name))}${td(
        l.debit ? money(l.debit) : "",
        true
      )}${td(l.credit ? money(l.credit) : "", true)}</tr>`
    )
    .join("");
  const balanced = journal.totalDebit === journal.totalCredit;
  return `
    <p>Payroll journal for ${journal.periodDescription}, summarised from ${journal.payslipCount} payslip(s).</p>
    <p class="text-sm text-muted-foreground">
      Employer UIF is taken as equal to the employees' UIF (1% each). SDL is the employer levy on each payslip.
      ${missingCodes ? "Some lines have no account code yet; an Admin can set them under Settings → Company details." : ""}
    </p>
    <br/>
    ${table(
      `${th("Account code")}${th("Account")}${th("Debit", true)}${th("Credit", true)}`,
      `${body}<tr class="border-t font-semibold">${td("")}${td("Total")}${td(
        money(journal.totalDebit),
        true
      )}${td(money(journal.totalCredit), true)}</tr>`
    )}
    <p class="text-sm ${balanced ? "text-muted-foreground" : "text-red-700"}">
      ${balanced ? "Debits equal credits." : "Debits and credits do not balance; check the source payslips."}
    </p>`;
}

export function payrollJournalCsv(journal: PayrollJournal, postingDate: string): string | null {
  if (journal.payslipCount === 0) return null;
  const description = `Payroll ${journal.periodDescription}`;
  return toCsv(
    ["Date", "Account code", "Account name", "Description", "Debit", "Credit"],
    journal.lines.map((l) => [
      postingDate,
      csvText(l.code),
      csvText(l.name),
      csvText(description),
      l.debit ? l.debit.toFixed(2) : "",
      l.credit ? l.credit.toFixed(2) : "",
    ])
  );
}

// ---------------------------------------------------------------------------
// Loan register
// ---------------------------------------------------------------------------

export interface LoanRegisterRow {
  loanId: string;
  employee: string;
  loanType: string;
  startDate: string;
  loanAmount: number;
  repaymentAmount: number;
  frequency: string;
  status: string;
  repaidInPeriod: number;
  outstanding: number;
}

export function buildLoanRegister(
  loans: Loan[],
  employees: MockEmployee[],
  bounds: { start: string; end: string } | null
): LoanRegisterRow[] {
  return loans
    .filter((l) => !bounds || l.startDate <= bounds.end)
    .map((l) => ({
      loanId: l.id,
      employee: employeeName(employees, l.employeeId),
      loanType: l.loanType,
      startDate: l.startDate,
      loanAmount: round2(l.loanAmount || 0),
      repaymentAmount: round2(l.repaymentAmount || 0),
      frequency: l.frequency,
      status: l.status === "completed" ? "Settled" : l.paused ? "Paused" : "Active",
      repaidInPeriod: round2(
        (l.deductionHistory || [])
          .filter((h) => h.type !== "pause" && inBounds(h.date, bounds))
          .reduce((s, h) => s + (h.amount || 0), 0)
      ),
      outstanding: round2(l.remainingBalance || 0),
    }))
    .sort((a, b) => a.employee.localeCompare(b.employee) || a.startDate.localeCompare(b.startDate));
}

export function generateLoanRegisterReportContent(rows: LoanRegisterRow[], periodLabel: string): string {
  if (rows.length === 0) return `<p>No staff loans recorded up to ${periodLabel}.</p>`;
  const total = (k: "loanAmount" | "repaidInPeriod" | "outstanding") =>
    money(round2(rows.reduce((s, r) => s + r[k], 0)));
  const body = rows
    .map(
      (r) => `<tr class="border-b">${td(escapeHtml(r.employee))}${td(r.loanType)}${td(r.startDate)}${td(
        money(r.loanAmount),
        true
      )}${td(`${money(r.repaymentAmount)} ${r.frequency}`, true)}${td(r.status)}${td(
        money(r.repaidInPeriod),
        true
      )}${td(money(r.outstanding), true)}</tr>`
    )
    .join("");
  return `
    <p>Staff loans taken out up to the end of ${periodLabel}, with repayments recorded in the period.</p>
    <p class="text-sm text-muted-foreground">
      The outstanding balance is the balance today, not at period end. For balances as at a payslip, use
      "Employee deductions for the accountant".
    </p>
    <br/>
    ${table(
      `${th("Employee")}${th("Type")}${th("Start date")}${th("Loan amount", true)}${th(
        "Repayment",
        true
      )}${th("Status")}${th("Repaid in period", true)}${th("Outstanding", true)}`,
      `${body}<tr class="border-t font-semibold">${td("Total")}${td("")}${td("")}${td(
        total("loanAmount"),
        true
      )}${td("")}${td("")}${td(total("repaidInPeriod"), true)}${td(total("outstanding"), true)}</tr>`
    )}`;
}

export function loanRegisterCsv(rows: LoanRegisterRow[]): string | null {
  if (rows.length === 0) return null;
  return toCsv(
    ["Employee", "Loan type", "Start date", "Loan amount", "Repayment", "Frequency", "Status", "Repaid in period", "Outstanding"],
    rows.map((r) => [
      csvText(r.employee),
      r.loanType,
      r.startDate,
      r.loanAmount.toFixed(2),
      r.repaymentAmount.toFixed(2),
      r.frequency,
      r.status,
      r.repaidInPeriod.toFixed(2),
      r.outstanding.toFixed(2),
    ])
  );
}

// ---------------------------------------------------------------------------
// Savings register
// ---------------------------------------------------------------------------

export interface SavingsRegisterRow {
  employeeId: string;
  employee: string;
  contribution: number;
  frequency: string;
  status: string;
  contributedInPeriod: number;
  /** From the employee's last payslip up to period end; null when no payslip recorded a balance. */
  balance: number | null;
}

export function buildSavingsRegister(
  plans: SavingPlan[],
  allPayslips: MockPayslip[],
  employees: MockEmployee[],
  bounds: { start: string; end: string } | null
): SavingsRegisterRow[] {
  return plans
    .filter((p) => !bounds || p.startDate <= bounds.end)
    .map((plan) => {
      const slips = allPayslips
        .filter((s) => s.employeeId === plan.employeeId && (!bounds || payslipStart(s) <= bounds.end))
        .sort((a, b) => payslipStart(a).localeCompare(payslipStart(b)));
      const inPeriod = slips.filter((s) => inBounds(payslipStart(s), bounds));
      const lastWithBalance = [...slips].reverse().find((s) => s.savingsBalance != null);
      return {
        employeeId: plan.employeeId,
        employee: employeeName(employees, plan.employeeId),
        contribution: round2(plan.amount || 0),
        frequency: plan.frequency,
        status: plan.status === "completed" ? "Completed" : "Active",
        contributedInPeriod: round2(inPeriod.reduce((s, p) => s + sumByName(p, "Savings"), 0)),
        balance: lastWithBalance?.savingsBalance ?? null,
      };
    })
    .sort((a, b) => a.employee.localeCompare(b.employee));
}

export function generateSavingsRegisterReportContent(rows: SavingsRegisterRow[], periodLabel: string): string {
  if (rows.length === 0) return `<p>No staff savings plans recorded up to ${periodLabel}.</p>`;
  const contributed = round2(rows.reduce((s, r) => s + r.contributedInPeriod, 0));
  const balance = round2(rows.reduce((s, r) => s + (r.balance ?? 0), 0));
  const body = rows
    .map(
      (r) => `<tr class="border-b">${td(escapeHtml(r.employee))}${td(
        `${money(r.contribution)} ${r.frequency}`,
        true
      )}${td(r.status)}${td(money(r.contributedInPeriod), true)}${td(
        r.balance == null ? "—" : money(r.balance),
        true
      )}</tr>`
    )
    .join("");
  return `
    <p>Savings held for staff, with contributions deducted in ${periodLabel}.</p>
    <p class="text-sm text-muted-foreground">
      The balance is from each employee's last payslip up to the end of the period. "—" means no payslip
      has recorded a savings balance yet.
    </p>
    <br/>
    ${table(
      `${th("Employee")}${th("Contribution", true)}${th("Status")}${th("Contributed in period", true)}${th(
        "Balance held",
        true
      )}`,
      `${body}<tr class="border-t font-semibold">${td("Total")}${td("")}${td("")}${td(
        money(contributed),
        true
      )}${td(money(balance), true)}</tr>`
    )}`;
}

export function savingsRegisterCsv(rows: SavingsRegisterRow[]): string | null {
  if (rows.length === 0) return null;
  return toCsv(
    ["Employee", "Contribution", "Frequency", "Status", "Contributed in period", "Balance held"],
    rows.map((r) => [
      csvText(r.employee),
      r.contribution.toFixed(2),
      r.frequency,
      r.status,
      r.contributedInPeriod.toFixed(2),
      r.balance == null ? "" : r.balance.toFixed(2),
    ])
  );
}

// ---------------------------------------------------------------------------
// Payroll run approvals
// ---------------------------------------------------------------------------

export interface RunApprovalRow {
  runId: string;
  period: string;
  cycle: string;
  status: string;
  createdBy: string;
  createdAt: string | null;
  reviewedBy: string;
  reviewedAt: string | null;
  approvedBy: string;
  approvedAt: string | null;
  lockedAt: string | null;
  paidAt: string | null;
  cancellation: string;
  flags: string[];
}

export function buildRunApprovals(
  runs: PayrollRun[],
  users: AccessListUser[],
  bounds: { start: string; end: string } | null
): RunApprovalRow[] {
  const name = (id?: string | null) =>
    id ? users.find((u) => u.id === id)?.name || "Unknown user" : "—";
  return runs
    .filter((r) => !bounds || (r.periodEnd >= bounds.start && r.periodStart <= bounds.end))
    .map((r) => {
      const flags: string[] = [];
      if (r.approvedBy && r.approvedBy === r.userId) flags.push("Created and approved by the same person");
      if (r.approvedBy && r.reviewedBy && r.approvedBy === r.reviewedBy) {
        flags.push("Reviewed and approved by the same person");
      }
      if ((r.status === "Locked" || r.status === "Paid") && !r.approvedAt) {
        flags.push("No approval recorded");
      }
      return {
        runId: r.id,
        period: `${r.periodStart} – ${r.periodEnd}`,
        cycle: r.payCycleType,
        status: r.status,
        createdBy: name(r.userId),
        createdAt: r.createdAt ?? null,
        reviewedBy: name(r.reviewedBy),
        reviewedAt: r.reviewedAt ?? null,
        approvedBy: name(r.approvedBy),
        approvedAt: r.approvedAt ?? null,
        lockedAt: r.lockedAt ?? null,
        paidAt: r.paidAt ?? null,
        cancellation:
          r.status === "Cancelled"
            ? `${name(r.cancelledBy)} on ${dateOnly(r.cancelledAt)}${r.cancellationReason ? `: ${r.cancellationReason}` : ""}`
            : "",
        flags,
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function generateRunApprovalsReportContent(rows: RunApprovalRow[], periodLabel: string): string {
  if (rows.length === 0) return `<p>No payroll runs cover ${periodLabel}.</p>`;
  const body = rows
    .map(
      (r) => `<tr class="border-b">
        ${td(r.period)}${td(escapeHtml(r.cycle))}${td(r.status)}
        ${td(`${escapeHtml(r.createdBy)}<br/><span class="text-xs">${dateTime(r.createdAt)}</span>`)}
        ${td(`${escapeHtml(r.reviewedBy)}<br/><span class="text-xs">${dateTime(r.reviewedAt)}</span>`)}
        ${td(`${escapeHtml(r.approvedBy)}<br/><span class="text-xs">${dateTime(r.approvedAt)}</span>`)}
        ${td(dateTime(r.lockedAt))}${td(dateTime(r.paidAt))}
        ${td(escapeHtml([r.cancellation, ...r.flags].filter(Boolean).join("; ") || "—"))}
      </tr>`
    )
    .join("");
  const flagged = rows.filter((r) => r.flags.length > 0).length;
  return `
    <p>Who created, reviewed, approved, locked and paid each payroll run covering ${periodLabel}.</p>
    <p class="text-sm ${flagged ? "text-amber-700" : "text-muted-foreground"}">
      ${flagged ? `${flagged} run(s) have a control note in the last column.` : "No control exceptions found."}
    </p>
    <br/>
    ${table(
      `${th("Pay period")}${th("Cycle")}${th("Status")}${th("Created")}${th("Reviewed")}${th(
        "Approved"
      )}${th("Locked")}${th("Paid")}${th("Notes")}`,
      body
    )}`;
}

// ---------------------------------------------------------------------------
// Master data changes
// ---------------------------------------------------------------------------

const MASTER_DATA_MODULES = new Set(["employee", "settings", "user"]);

export function selectMasterDataChanges(logs: AuditLogEntry[]): AuditLogEntry[] {
  return logs
    .filter((l) => MASTER_DATA_MODULES.has(l.module) || (l.severity === "change" && l.module !== "reports"))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function generateMasterDataChangesReportContent(logs: AuditLogEntry[], periodLabel: string): string {
  const rows = selectMasterDataChanges(logs);
  const note = `<p class="text-sm text-muted-foreground">
      Changes to employees, users and company or payroll settings recorded in the audit log. Until November
      2026 the audit log kept only sign-ins, so earlier changes are not listed.
    </p>`;
  if (rows.length === 0) return `<p>No master data changes recorded for ${periodLabel}.</p>${note}`;
  const body = rows
    .map(
      (l) => `<tr class="border-b">${td(dateTime(l.createdAt))}${td(
        escapeHtml(l.userName || l.userEmail || "System")
      )}${td(escapeHtml(l.module))}${td(escapeHtml(l.message || l.action))}</tr>`
    )
    .join("");
  return `
    <p>${rows.length} master data change(s) recorded for ${periodLabel}.</p>
    ${note}
    <br/>
    ${table(`${th("When")}${th("Who")}${th("Area")}${th("Change")}`, body)}`;
}

// ---------------------------------------------------------------------------
// User access list
// ---------------------------------------------------------------------------

export function generateUserAccessReportContent(users: AccessListUser[], now: Date = new Date()): string {
  if (users.length === 0) return "<p>No users found.</p>";
  const sorted = [...users].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  const accessNote = (u: AccessListUser) => {
    if (u.status && u.status !== "Active") return "Deactivated";
    if (u.accessExpiresAt && new Date(u.accessExpiresAt) <= now) return "Access ended";
    if (u.accessExpiresAt) return `Until ${dateOnly(u.accessExpiresAt)}`;
    return "No end date";
  };
  const body = sorted
    .map(
      (u) => `<tr class="border-b">${td(escapeHtml(u.name))}${td(escapeHtml(u.email))}${td(
        escapeHtml(u.role)
      )}${td(escapeHtml(u.status || "—"))}${td(accessNote(u))}${td(dateOnly(u.createdAt))}${td(
        dateTime(u.lastSignInAt)
      )}</tr>`
    )
    .join("");
  const counts = sorted.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([role, n]) => `${n} ${escapeHtml(role)}`)
    .join(", ");
  return `
    <p>Everyone with a login to the payroll system as at ${dateOnly(now.toISOString())}: ${summary}.</p>
    <p class="text-sm text-muted-foreground">Admins can change payroll and settings; Managers can run payroll;
    Staff see only their own payslips; Accountants have read-only access.</p>
    <br/>
    ${table(
      `${th("Name")}${th("Email")}${th("Role")}${th("Status")}${th("Access")}${th("Created")}${th(
        "Last sign-in"
      )}`,
      body
    )}`;
}

export function userAccessCsv(users: AccessListUser[]): string | null {
  if (users.length === 0) return null;
  return toCsv(
    ["Name", "Email", "Role", "Status", "Access until", "Created", "Last sign-in"],
    users.map((u) => [
      csvText(u.name),
      csvText(u.email),
      u.role,
      u.status || "",
      u.accessExpiresAt ? u.accessExpiresAt.slice(0, 10) : "",
      u.createdAt ? u.createdAt.slice(0, 10) : "",
      u.lastSignInAt ?? "",
    ])
  );
}
