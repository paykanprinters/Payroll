import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import type { MockEmployee, MockPayslip } from "../mock-data-interfaces";
import {
  filterPayslipsForSarsTaxYear,
  getSarsTaxYearPeriodLabel,
  taxYearFromSelectedDate,
} from "@/lib/tax-year-period";
import { escapeCsvField } from "./easyfile-export";
import {
  isPayslipInPayWeekOf,
  payWeekForDate,
  type ReportPeriodType,
} from "@/lib/reports-admin-summary";
import { isCashPaid, shouldTrackEmployeeTax } from "@/lib/employee-tax-tracking";

export interface EmployeeDeductionRow {
  employeeId: string;
  name: string;
  idNumber: string;
  payslipCount: number;
  gross: number;
  paye: number;
  uif: number;
  loan: number;
  savings: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  /** From the employee's last payslip in the period; null when that payslip predates balance tracking. */
  loanBalance: number | null;
  savingsBalance: number | null;
}

export interface EmployeeDeductionsReport {
  periodDescription: string;
  rows: EmployeeDeductionRow[];
  /** Cash-paid employees are not listed, but their PAYE and UIF are included in the totals. */
  cash: { employeeCount: number; paye: number; uif: number };
  totals: Omit<EmployeeDeductionRow, "employeeId" | "name" | "idNumber" | "loanBalance" | "savingsBalance"> & {
    loanBalance: number;
    savingsBalance: number;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const sumByName = (p: MockPayslip, name: string) =>
  p.deductionsBreakdown.filter((d) => d.name === name).reduce((s, d) => s + d.amount, 0);

const periodStart = (p: MockPayslip) => p.payPeriod.split(" - ")[0];

export function selectPayslipsForEmployeeDeductions(
  payslips: MockPayslip[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): { payslips: MockPayslip[]; periodDescription: string } {
  if (!selectedDate) return { payslips, periodDescription: "All periods" };
  if (periodType === "weekly") {
    const week = payWeekForDate(payslips, selectedDate);
    return {
      payslips: payslips.filter((p) => isPayslipInPayWeekOf(p, selectedDate)),
      periodDescription: week
        ? `the pay week ${week.label}`
        : `the pay week of ${format(selectedDate, "d MMM yyyy")}`,
    };
  }
  if (periodType === "yearly") {
    const taxYear = taxYearFromSelectedDate(selectedDate);
    return {
      payslips: filterPayslipsForSarsTaxYear(payslips, taxYear),
      periodDescription: `Tax year ${taxYear} (${getSarsTaxYearPeriodLabel(taxYear)})`,
    };
  }
  return {
    payslips: payslips.filter((p) => {
      const d = parseISO(periodStart(p));
      return isSameMonth(d, selectedDate) && isSameYear(d, selectedDate);
    }),
    periodDescription: format(selectedDate, "MMMM yyyy"),
  };
}

export function buildEmployeeDeductionsReport(
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): EmployeeDeductionsReport {
  const selected = selectPayslipsForEmployeeDeductions(payslips, selectedDate, periodType);
  const employeesById = new Map(employees.map((e) => [e.id, e]));
  const byEmployee = new Map<string, MockPayslip[]>();
  const cashEmployees = new Set<string>();
  let cashPaye = 0;
  let cashUif = 0;
  for (const p of selected.payslips) {
    const emp = employeesById.get(p.employeeId);
    if (isCashPaid(emp)) {
      if (shouldTrackEmployeeTax(emp)) {
        cashEmployees.add(p.employeeId);
        cashPaye += sumByName(p, "PAYE");
        cashUif += sumByName(p, "UIF");
      }
      continue;
    }
    const list = byEmployee.get(p.employeeId) ?? [];
    list.push(p);
    byEmployee.set(p.employeeId, list);
  }

  const rows: EmployeeDeductionRow[] = Array.from(byEmployee.entries()).map(([employeeId, slips]) => {
    const emp = employeesById.get(employeeId);
    const sorted = [...slips].sort((a, b) => periodStart(a).localeCompare(periodStart(b)));
    const last = sorted[sorted.length - 1];
    let gross = 0, paye = 0, uif = 0, loan = 0, savings = 0, totalDeductions = 0, net = 0;
    for (const p of sorted) {
      gross += p.grossEarnings || 0;
      paye += sumByName(p, "PAYE");
      uif += sumByName(p, "UIF");
      loan += p.loanDeduction ?? sumByName(p, "Loan Repayment");
      savings += sumByName(p, "Savings");
      totalDeductions += p.totalDeductions || 0;
      net += p.netPay || 0;
    }
    return {
      employeeId,
      name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown employee",
      idNumber: emp?.idNumber ?? "",
      payslipCount: sorted.length,
      gross: round2(gross),
      paye: round2(paye),
      uif: round2(uif),
      loan: round2(loan),
      savings: round2(savings),
      otherDeductions: round2(totalDeductions - paye - uif - loan - savings),
      totalDeductions: round2(totalDeductions),
      net: round2(net),
      loanBalance: last.loanBalance ?? null,
      savingsBalance: last.savingsBalance ?? null,
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));

  const sum = (key: keyof EmployeeDeductionRow) =>
    round2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));

  return {
    periodDescription: selected.periodDescription,
    rows,
    cash: { employeeCount: cashEmployees.size, paye: round2(cashPaye), uif: round2(cashUif) },
    totals: {
      payslipCount: rows.reduce((s, r) => s + r.payslipCount, 0),
      gross: sum("gross"),
      paye: round2(sum("paye") + cashPaye),
      uif: round2(sum("uif") + cashUif),
      loan: sum("loan"),
      savings: sum("savings"),
      otherDeductions: sum("otherDeductions"),
      totalDeductions: sum("totalDeductions"),
      net: sum("net"),
      loanBalance: sum("loanBalance"),
      savingsBalance: sum("savingsBalance"),
    },
  };
}

const money = (n: number) => n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const balance = (n: number | null) => (n == null ? "—" : money(n));
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function cashNote(cash: EmployeeDeductionsReport["cash"]): string | null {
  if (cash.employeeCount === 0) return null;
  const who = cash.employeeCount === 1 ? "1 cash-paid employee" : `${cash.employeeCount} cash-paid employees`;
  return (
    `* Cash payment employees have not been captured in this report. The PAYE and UIF totals include ` +
    `PAYE of R ${money(cash.paye)} and UIF of R ${money(cash.uif)} for ${who}.`
  );
}

export const generateEmployeeDeductionsReportContent = (
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): string => {
  const report = buildEmployeeDeductionsReport(payslips, employees, selectedDate, periodType);
  if (report.rows.length === 0 && report.cash.employeeCount === 0) {
    return `<p>No payslip data available for ${report.periodDescription} to generate this report.</p>`;
  }
  const t = report.totals;
  const note = cashNote(report.cash);
  const star = note ? "*" : "";
  const cell = (v: string, right = true) =>
    `<td class="py-2 px-3${right ? " text-right" : ""}">${v}</td>`;

  const body = report.rows
    .map(
      (r) => `
      <tr class="border-b">
        ${cell(escapeHtml(r.name), false)}
        ${cell(String(r.payslipCount))}
        ${cell(money(r.gross))}
        ${cell(money(r.paye))}
        ${cell(money(r.uif))}
        ${cell(money(r.loan))}
        ${cell(money(r.savings))}
        ${cell(money(r.otherDeductions))}
        ${cell(money(r.totalDeductions))}
        ${cell(money(r.net))}
        ${cell(balance(r.loanBalance))}
        ${cell(balance(r.savingsBalance))}
      </tr>`
    )
    .join("");

  return `
    <p>PAYE, UIF, loan repayments and savings deducted from each employee's payslips for ${report.periodDescription}.</p>
    <p class="text-sm text-muted-foreground">
      Amounts in rand. Balances are as at each employee's last payslip in the period; "—" means that payslip
      was generated before balances were recorded. Employer SDL is not deducted from employees and is not shown.
    </p>
    <br/>
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-3">Employee</th>
          <th class="py-2 px-3 text-right">Payslips</th>
          <th class="py-2 px-3 text-right">Gross</th>
          <th class="py-2 px-3 text-right">PAYE</th>
          <th class="py-2 px-3 text-right">UIF</th>
          <th class="py-2 px-3 text-right">Loan repayments</th>
          <th class="py-2 px-3 text-right">Savings</th>
          <th class="py-2 px-3 text-right">Other deductions</th>
          <th class="py-2 px-3 text-right">Total deductions</th>
          <th class="py-2 px-3 text-right">Net pay</th>
          <th class="py-2 px-3 text-right">Loan balance</th>
          <th class="py-2 px-3 text-right">Savings balance</th>
        </tr>
      </thead>
      <tbody>${body}
        <tr class="border-t font-semibold">
          ${cell("Total", false)}
          ${cell(String(t.payslipCount))}
          ${cell(money(t.gross))}
          ${cell(money(t.paye) + star)}
          ${cell(money(t.uif) + star)}
          ${cell(money(t.loan))}
          ${cell(money(t.savings))}
          ${cell(money(t.otherDeductions))}
          ${cell(money(t.totalDeductions))}
          ${cell(money(t.net))}
          ${cell(money(t.loanBalance))}
          ${cell(money(t.savingsBalance))}
        </tr>
      </tbody>
    </table>
    ${note ? `<p class="text-sm text-muted-foreground" style="margin-top:8px">${note}</p>` : ""}
  `;
};

export function employeeDeductionsCsv(
  payslips: MockPayslip[],
  employees: MockEmployee[],
  selectedDate: Date | undefined,
  periodType: ReportPeriodType
): string | null {
  const report = buildEmployeeDeductionsReport(payslips, employees, selectedDate, periodType);
  if (report.rows.length === 0 && report.cash.employeeCount === 0) return null;
  const header = [
    "Employee",
    "ID number",
    "Payslips",
    "Gross",
    "PAYE",
    "UIF",
    "Loan repayments",
    "Savings",
    "Other deductions",
    "Total deductions",
    "Net pay",
    "Loan balance",
    "Savings balance",
  ];
  const num = (n: number | null) => (n == null ? "" : n.toFixed(2));
  const text = (s: string) => (/^[=+\-@]/.test(s) ? `'${s}` : s);
  // Excel drops leading zeros and switches 13-digit IDs to scientific notation unless forced to text.
  const idText = (s: string) => (s ? `="${s.replace(/"/g, "")}"` : "");
  const lines = report.rows.map((r) =>
    [
      text(r.name),
      idText(r.idNumber),
      String(r.payslipCount),
      num(r.gross),
      num(r.paye),
      num(r.uif),
      num(r.loan),
      num(r.savings),
      num(r.otherDeductions),
      num(r.totalDeductions),
      num(r.net),
      num(r.loanBalance),
      num(r.savingsBalance),
    ]
      .map(escapeCsvField)
      .join(",")
  );
  const t = report.totals;
  const note = cashNote(report.cash);
  const star = note ? "*" : "";
  lines.push(
    [
      "Total",
      "",
      String(t.payslipCount),
      num(t.gross),
      num(t.paye) + star,
      num(t.uif) + star,
      num(t.loan),
      num(t.savings),
      num(t.otherDeductions),
      num(t.totalDeductions),
      num(t.net),
      num(t.loanBalance),
      num(t.savingsBalance),
    ]
      .map(escapeCsvField)
      .join(",")
  );
  if (note) lines.push("", escapeCsvField(note));
  return `\uFEFF${[header.map(escapeCsvField).join(","), ...lines].join("\r\n")}`;
}
