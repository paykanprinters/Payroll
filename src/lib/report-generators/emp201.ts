import { MockEmployee, MockPayslip } from "../mock-data-interfaces";
import { sumEmployerSdl } from "@/lib/sdl";
import { format, isSameMonth, isSameYear, parseISO } from "date-fns";

/**
 * EMP201 — Monthly Employer Declaration to SARS.
 *
 * Declares the three statutory liabilities for a calendar (tax) month:
 *   - PAYE  : total employees' tax withheld.
 *   - SDL   : 1% employer Skills Development Levy (employer cost).
 *   - UIF   : 2% total — 1% withheld from the employee + 1% employer contribution.
 *
 * Payment is due to SARS by the 7th of the following month. ETI (Employment Tax
 * Incentive) is not modelled yet and is reported as 0.
 */
export interface Emp201Totals {
  /** Number of payslips included in the declaration. */
  payslipCount: number;
  /** Total employees' tax (PAYE) withheld. */
  paye: number;
  /** UIF withheld from employees (1%). */
  uifEmployee: number;
  /** Employer UIF contribution (1%, matches the employee portion). */
  uifEmployer: number;
  /** Total UIF declared on the EMP201 (2%). */
  uifTotal: number;
  /** Employer Skills Development Levy (1%). */
  sdl: number;
  /** Employment Tax Incentive claimed (not modelled — always 0 for now). */
  eti: number;
  /** Total amount payable to SARS (PAYE + UIF + SDL − ETI). */
  totalPayable: number;
}

const sumDeduction = (payslips: MockPayslip[], name: string): number =>
  payslips.reduce(
    (sum, p) =>
      sum + (p.deductionsBreakdown?.find((d) => d.name === name)?.amount ?? 0),
    0
  );

/** Compute EMP201 statutory totals for a set of payslips (already period-filtered). */
export const computeEmp201Totals = (payslips: MockPayslip[]): Emp201Totals => {
  const paye = sumDeduction(payslips, "PAYE");
  const uifEmployee = sumDeduction(payslips, "UIF");
  // SARS UIF is 2%: the employer matches the employee's 1% contribution.
  const uifEmployer = uifEmployee;
  const uifTotal = uifEmployee + uifEmployer;
  const sdl = sumEmployerSdl(payslips);
  const eti = 0;
  const totalPayable = paye + uifTotal + sdl - eti;

  return {
    payslipCount: payslips.length,
    paye,
    uifEmployee,
    uifEmployer,
    uifTotal,
    sdl,
    eti,
    totalPayable,
  };
};

/** Filter payslips to a single calendar month (EMP201 is a monthly declaration). */
const filterPayslipsForMonth = (
  payslips: MockPayslip[],
  selectedDate: Date | undefined
): MockPayslip[] => {
  if (!selectedDate) return payslips;
  return payslips.filter((p) => {
    const [startPeriodStr] = (p.payPeriod || "").split(" - ");
    if (!startPeriodStr) return false;
    const payslipDate = parseISO(startPeriodStr);
    return isSameMonth(payslipDate, selectedDate) && isSameYear(payslipDate, selectedDate);
  });
};

const money = (n: number) =>
  n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const generateEmp201ReportContent = (
  payslips: MockPayslip[],
  _employees: MockEmployee[],
  selectedDate: Date | undefined,
  _periodType: "monthly" | "yearly"
): string => {
  const monthLabel = selectedDate ? format(selectedDate, "MMMM yyyy") : "All Periods";
  const filtered = filterPayslipsForMonth(payslips, selectedDate);

  if (filtered.length === 0) {
    return `<p>No payslip data available for ${monthLabel} to generate the EMP201 declaration.</p>`;
  }

  const t = computeEmp201Totals(filtered);
  const dueDate = selectedDate
    ? format(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 7), "d MMMM yyyy")
    : "the 7th of the following month";

  const row = (label: string, value: number, note = "") => `
      <tr class="border-b">
        <td class="py-2 px-4">${label}${note ? ` <span class="text-muted-foreground">${note}</span>` : ""}</td>
        <td class="py-2 px-4 text-right">${money(value)}</td>
      </tr>`;

  return `
    <p>EMP201 Monthly Employer Declaration for <strong>${monthLabel}</strong> (${t.payslipCount} payslip${t.payslipCount === 1 ? "" : "s"}).</p>
    <p class="text-sm text-muted-foreground">Payment due to SARS by <strong>${dueDate}</strong>.</p>
    <br/>
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="py-2 px-4">Declaration line</th>
          <th class="py-2 px-4 text-right">Amount (R)</th>
        </tr>
      </thead>
      <tbody>
        ${row("PAYE (employees' tax)", t.paye)}
        ${row("SDL (1% employer levy)", t.sdl)}
        ${row("UIF — employee (1%)", t.uifEmployee)}
        ${row("UIF — employer (1%)", t.uifEmployer)}
        ${row("UIF total (2%)", t.uifTotal)}
        ${row("ETI claimed", t.eti, "(not modelled)")}
        <tr class="border-b font-semibold">
          <td class="py-2 px-4">Total payable to SARS</td>
          <td class="py-2 px-4 text-right">${money(t.totalPayable)}</td>
        </tr>
      </tbody>
    </table>
    <br/>
    <p class="text-sm text-muted-foreground">
      Total payable = PAYE + UIF (2%) + SDL − ETI. UIF is declared at 2%: the 1%
      withheld from employees plus the employer's matching 1%. Verify against your
      SARS eFiling EMP201 before payment.
    </p>
  `;
};
