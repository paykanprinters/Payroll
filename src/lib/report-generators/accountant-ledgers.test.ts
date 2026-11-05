import { describe, expect, it } from "vitest";
import {
  buildLoanRegister,
  buildPayrollJournal,
  buildRunApprovals,
  buildSavingsRegister,
  payrollJournalCsv,
  reportPeriodBounds,
  selectMasterDataChanges,
} from "@/lib/report-generators/accountant-ledgers";
import { DEFAULT_JOURNAL_ACCOUNTS, mergeJournalAccounts } from "@/lib/accountant-report-data";
import type { Loan, MockEmployee, MockPayslip, SavingPlan } from "@/lib/mock-data-interfaces";
import type { PayrollRun } from "@/integrations/supabase/payroll-run-queries";
import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";

const employees = [
  { id: "e1", firstName: "Zanele", lastName: "Mokoena" },
  { id: "e2", firstName: "Andre", lastName: "Botha" },
] as MockEmployee[];

const slip = (
  employeeId: string,
  payPeriod: string,
  extra: Partial<MockPayslip> = {},
  deductions: { name: string; amount: number }[] = [
    { name: "PAYE", amount: 100 },
    { name: "UIF", amount: 20 },
    { name: "Loan Repayment", amount: 50 },
    { name: "Savings", amount: 30 },
    { name: "Medical aid", amount: 10 },
  ]
): MockPayslip =>
  ({
    id: `${employeeId}-${payPeriod}`,
    employeeId,
    payPeriod,
    payDate: "01/01/2026",
    grossEarnings: 2000,
    totalDeductions: deductions.reduce((s, d) => s + d.amount, 0),
    netPay: 2000 - deductions.reduce((s, d) => s + d.amount, 0),
    employerSdl: 20,
    earningsBreakdown: [],
    deductionsBreakdown: deductions,
    leaveSummary: { annual: 0, sick: 0, unpaid: 0 },
    ytdGrossEarnings: 0,
    ytdTotalDeductions: 0,
    ...extra,
  }) as MockPayslip;

const october = new Date(2026, 9, 15);

describe("buildPayrollJournal", () => {
  const payslips = [
    slip("e1", "2026-10-07 - 2026-10-13", { loanDeduction: 50 }),
    slip("e2", "2026-10-14 - 2026-10-20", { loanDeduction: 50 }),
    slip("e1", "2026-11-04 - 2026-11-10"),
  ];

  it("balances and splits the month's payslips into ledger lines", () => {
    const journal = buildPayrollJournal(payslips, october, "monthly", DEFAULT_JOURNAL_ACCOUNTS);
    expect(journal.payslipCount).toBe(2);
    const line = (id: string) => journal.lines.find((l) => l.id === id);
    expect(line("salariesExpense")?.debit).toBe(4000);
    expect(line("employerUifExpense")?.debit).toBe(40);
    expect(line("sdlExpense")?.debit).toBe(40);
    expect(line("payePayable")?.credit).toBe(200);
    expect(line("uifPayable")?.credit).toBe(80);
    expect(line("staffLoans")?.credit).toBe(100);
    expect(line("staffSavings")?.credit).toBe(60);
    expect(line("otherDeductionsPayable")?.credit).toBe(20);
    expect(line("netPayPayable")?.credit).toBe(3580);
    expect(journal.totalDebit).toBe(journal.totalCredit);
  });

  it("uses saved account codes in the CSV", () => {
    const accounts = mergeJournalAccounts({ salariesExpense: { code: "4000", name: "Wages" } });
    const journal = buildPayrollJournal(payslips, october, "monthly", accounts);
    const csv = payrollJournalCsv(journal, "2026-10-31")!;
    expect(csv).toContain("2026-10-31,4000,Wages,Payroll October 2026,4000.00,");
  });
});

describe("reportPeriodBounds", () => {
  it("uses the SARS tax year for yearly reports", () => {
    expect(reportPeriodBounds([], new Date(2027, 0, 1), "yearly")).toEqual({
      start: "2026-03-01",
      end: "2027-02-28",
    });
  });
});

describe("buildLoanRegister", () => {
  it("sums repayments in the period, ignoring pauses and loans started later", () => {
    const loans = [
      {
        id: "l1",
        employeeId: "e1",
        loanType: "Personal",
        loanAmount: 1000,
        repaymentAmount: 50,
        frequency: "weekly",
        startDate: "2026-09-01",
        remainingBalance: 800,
        status: "active",
        paused: false,
        deductionHistory: [
          { date: "2026-09-29", amount: 50, type: "deduction" },
          { date: "2026-10-06", amount: 50, type: "deduction" },
          { date: "2026-10-13", amount: 0, type: "pause" },
          { date: "2026-10-20", amount: 100, type: "manual" },
        ],
      },
      { id: "l2", employeeId: "e2", startDate: "2026-11-02", deductionHistory: [] },
    ] as unknown as Loan[];
    const rows = buildLoanRegister(loans, employees, { start: "2026-10-01", end: "2026-10-31" });
    expect(rows).toHaveLength(1);
    expect(rows[0].repaidInPeriod).toBe(150);
    expect(rows[0].outstanding).toBe(800);
  });
});

describe("buildSavingsRegister", () => {
  it("takes contributions in the period and the latest balance up to period end", () => {
    const plans = [
      { id: "s1", employeeId: "e1", amount: 30, frequency: "weekly", startDate: "2026-01-01", status: "active" },
    ] as SavingPlan[];
    const payslips = [
      slip("e1", "2026-09-29 - 2026-10-05", { savingsBalance: 270 }),
      slip("e1", "2026-10-06 - 2026-10-12", { savingsBalance: 300 }),
      slip("e1", "2026-11-03 - 2026-11-09", { savingsBalance: 330 }),
    ];
    const [row] = buildSavingsRegister(plans, payslips, employees, { start: "2026-10-01", end: "2026-10-31" });
    expect(row.contributedInPeriod).toBe(30);
    expect(row.balance).toBe(300);
  });
});

describe("buildRunApprovals", () => {
  it("flags a run approved by the person who created it", () => {
    const runs = [
      {
        id: "r1",
        userId: "u1",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        payCycleType: "monthly",
        status: "Paid",
        approvedBy: "u1",
        approvedAt: "2026-10-30T10:00:00Z",
      },
      { id: "r2", userId: "u1", periodStart: "2026-12-01", periodEnd: "2026-12-31", payCycleType: "monthly", status: "Draft" },
    ] as PayrollRun[];
    const users = [{ id: "u1", name: "Admin One" }] as never;
    const rows = buildRunApprovals(runs, users, { start: "2026-10-01", end: "2026-10-31" });
    expect(rows).toHaveLength(1);
    expect(rows[0].approvedBy).toBe("Admin One");
    expect(rows[0].flags).toContain("Created and approved by the same person");
  });
});

describe("selectMasterDataChanges", () => {
  it("keeps employee, user and settings changes and drops report views and sign-ins", () => {
    const logs = [
      { id: "1", module: "employee", severity: "change", action: "employee_updated" },
      { id: "2", module: "reports", severity: "info", action: "report_viewed" },
      { id: "3", module: "auth", severity: "auth", action: "signed_in" },
      { id: "4", module: "settings", severity: "change", action: "settings_updated" },
    ] as AuditLogEntry[];
    expect(selectMasterDataChanges(logs).map((l) => l.id).sort()).toEqual(["1", "4"]);
  });
});
