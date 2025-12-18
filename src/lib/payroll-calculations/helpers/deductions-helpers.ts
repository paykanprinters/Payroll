import { format, differenceInYears } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LoanDeductionHistoryEntry } from "@/lib/mock-data-interfaces";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import { TaxTables } from "@/hooks/use-tax-tables";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { bankersRound } from "@/lib/utils";
import { calculatePAYE } from "@/lib/payroll-calculations";

const computeUIF = (
  grossEarnings: number,
  uifSdlRates: TaxTables["uifSdlRates"] | null,
  emp: MockEmployee,
  userTaxSettings: UserTaxSettings | null
) => {
  if (uifSdlRates) {
    const monthlyCap = uifSdlRates.uif_cap;
    const uifRate = uifSdlRates.uif_rate;
    const getCapForFrequency = (freq: MockEmployee["payFrequency"] | undefined) => {
      if (!freq) return monthlyCap;
      if (freq === "Weekly") return monthlyCap / 4.3333;
      if (freq === "Bi-Weekly") return monthlyCap / 2.1667;
      return monthlyCap;
    };
    const shouldProRate = userTaxSettings?.proRateUifCapByFrequency === true;
    const capToUse = shouldProRate ? getCapForFrequency(emp.payFrequency) : monthlyCap;
    return bankersRound(Math.min(grossEarnings * uifRate, capToUse), 2);
  }
  return bankersRound(Math.min(grossEarnings * 0.01, 177.12), 2);
};

const computePAYE = (
  taxableIncomeForPAYE: number,
  taxTables: TaxTables,
  emp: MockEmployee,
  userTaxSettings: UserTaxSettings | null
): number => {
  const applyPAYEFlag = userTaxSettings?.applyPaye ?? true;
  const { payeBrackets, taxYearDetails } = taxTables;
  if (!applyPAYEFlag || !payeBrackets || payeBrackets.length === 0 || !emp.payFrequency) return 0;

  let employeeAge: number | null = null;
  if (emp.dateOfBirth) {
    employeeAge = differenceInYears(new Date(), new Date(emp.dateOfBirth));
  }
  const paye = calculatePAYE(
    taxableIncomeForPAYE,
    payeBrackets,
    taxYearDetails,
    employeeAge,
    emp.payFrequency
  );
  return paye > 0 ? bankersRound(paye, 2) : 0;
};

export const buildDeductions = (
  emp: MockEmployee,
  grossEarnings: number,
  loans: Loan[],
  savingPlans: SavingPlan[],
  taxTables: TaxTables,
  userTaxSettings: UserTaxSettings | null,
  periodStart: Date,
  periodEnd: Date,
  payPeriodString: string,
  payrollSavingsEntries: PayrollSavingsEntry[] | null
) => {
  let totalDeductions = 0;
  const deductionsBreakdown: { name: string; amount: number }[] = [];

  const uif = computeUIF(grossEarnings, taxTables.uifSdlRates, emp, userTaxSettings);
  const taxableForPAYE = Math.max(0, grossEarnings - uif);
  const paye = computePAYE(taxableForPAYE, taxTables, emp, userTaxSettings);

  deductionsBreakdown.push({ name: "UIF", amount: uif });
  totalDeductions += uif;

  if (paye > 0) {
    deductionsBreakdown.push({ name: "PAYE", amount: paye });
    totalDeductions += paye;
  }

  const applySDLFlag = userTaxSettings?.applySdl ?? true;
  if (applySDLFlag) {
    if (taxTables.uifSdlRates) {
      const sdlRaw = taxableForPAYE * taxTables.uifSdlRates.sdl_rate + uif;
      const sdl = bankersRound(sdlRaw, 2);
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    } else {
      const sdl = bankersRound(grossEarnings * 0.01, 2);
      deductionsBreakdown.push({ name: "SDL", amount: sdl });
      totalDeductions += sdl;
    }
  }

  // Loans
  const isFullPeriod = (frequency: "Monthly" | "Weekly" | "Bi-Weekly", start: Date, end: Date): boolean => {
    if (frequency === "Monthly") {
      return (
        format(start, "dd") === "01" &&
        format(end, "dd") === format(new Date(end.getFullYear(), end.getMonth() + 1, 0), "dd")
      );
    }
    if (frequency === "Weekly") {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) === 6;
    }
    if (frequency === "Bi-Weekly") {
      return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) === 13;
    }
    return false;
  };

  loans.forEach((loan) => {
    if (loan.employeeId !== emp.id || loan.status === "completed" || new Date(loan.startDate) > periodEnd) return;

    if (loan.paused) {
      const pauseEntry: LoanDeductionHistoryEntry = {
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: 0,
        type: "pause",
        notes: `Deduction paused for pay period ${payPeriodString}`,
      };
      loan.deductionHistory.push(pauseEntry);
      loan.paused = false;
      return;
    }

    let deductionAmount = 0;
    const employeePayFrequency = emp.payFrequency;
    if (loan.frequency === employeePayFrequency?.toLowerCase()) {
      if (isFullPeriod(employeePayFrequency, periodStart, periodEnd)) {
        deductionAmount = loan.repaymentAmount;
      }
    } else if (employeePayFrequency === "Monthly" && loan.frequency === "weekly") {
      if (isFullPeriod("Monthly", periodStart, periodEnd)) deductionAmount = loan.repaymentAmount * 4;
    } else if (employeePayFrequency === "Bi-Weekly" && loan.frequency === "weekly") {
      if (isFullPeriod("Bi-Weekly", periodStart, periodEnd)) deductionAmount = loan.repaymentAmount * 2;
    }

    if (deductionAmount > 0) {
      const rounded = bankersRound(deductionAmount, 2);
      deductionsBreakdown.push({ name: "Loan Repayment", amount: rounded });
      totalDeductions += rounded;
      loan.remainingBalance -= rounded;

      const entry: LoanDeductionHistoryEntry = {
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: rounded,
        type: "deduction",
        notes: `Payroll deduction for pay period ${payPeriodString}`,
      };
      loan.deductionHistory.push(entry);
      if (loan.remainingBalance <= 0) {
        loan.status = "completed";
        loan.remainingBalance = 0;
      }
    }
  });

  // Savings
  savingPlans.forEach((plan) => {
    if (plan.employeeId !== emp.id || plan.status !== "active" || new Date(plan.startDate) > periodEnd) return;
    if (plan.endDate && new Date(plan.endDate) < periodStart) return;

    const employeePayFrequency = emp.payFrequency;

    const entryForPlan = payrollSavingsEntries?.find(
      (e) => e.planId === plan.id && e.employeeId === emp.id
    ) || null;

    const isPaused = entryForPlan?.paused === true;
    if (isPaused) return;

    const baseAmount = entryForPlan ? (entryForPlan.overrideAmount ?? entryForPlan.originalAmount) : plan.amount;

    let deductionAmount = 0;
    if (plan.frequency === employeePayFrequency?.toLowerCase()) {
      if (isFullPeriod(employeePayFrequency, periodStart, periodEnd)) deductionAmount = baseAmount;
    } else if (employeePayFrequency === "Monthly" && plan.frequency === "weekly") {
      if (isFullPeriod("Monthly", periodStart, periodEnd)) deductionAmount = baseAmount * 4;
    } else if (employeePayFrequency === "Bi-Weekly" && plan.frequency === "weekly") {
      if (isFullPeriod("Bi-Weekly", periodStart, periodEnd)) deductionAmount = baseAmount * 2;
    }

    if (deductionAmount > 0) {
      const rounded = bankersRound(deductionAmount, 2);
      deductionsBreakdown.push({ name: "Savings", amount: rounded });
      totalDeductions += rounded;
    }
  });

  totalDeductions = bankersRound(totalDeductions, 2);
  return { deductionsBreakdown, totalDeductions };
};