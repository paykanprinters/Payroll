import { format, differenceInYears, parseISO, isSameMonth, differenceInCalendarDays } from "date-fns";
import { MockEmployee, Loan, SavingPlan, LoanDeductionHistoryEntry } from "@/lib/mock-data-interfaces";
import { PayrollSavingsEntry } from "@/lib/savings-types";
import { TaxTables } from "@/hooks/use-tax-tables";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries";
import { bankersRound } from "@/lib/utils";
import { sumMoney } from "@/lib/money";
import { calculatePAYE } from "@/lib/payroll-calculations";
import { computeMonthlyMedicalTaxCredit, getSarsMedicalTaxCredits } from "@/lib/sars-tax-tables";
import { computeRetirementContribution } from "@/lib/retirement-fund";

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
    // Default pro-rate on unless explicitly disabled.
    const shouldProRate = userTaxSettings?.proRateUifCapByFrequency !== false;
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

  // Section 6A medical scheme fees tax credit (COMP-07). Default ON unless the
  // employer explicitly disables it. Credits are sourced per tax year.
  const applyMedicalCredit = userTaxSettings?.applyMedicalAidTaxCredit !== false;
  const monthlyMedicalCredit = applyMedicalCredit
    ? computeMonthlyMedicalTaxCredit(
        emp.medicalAidMember ?? false,
        emp.medicalAidDependants ?? 0,
        getSarsMedicalTaxCredits(taxYearDetails?.year ?? -1)
      )
    : 0;
  // The credit is a fixed monthly amount; annualize it for the PAYE engine,
  // which divides the annual result back down by the period count per year.
  const annualMedicalCredit = monthlyMedicalCredit * 12;

  const paye = calculatePAYE(
    taxableIncomeForPAYE,
    payeBrackets,
    taxYearDetails,
    employeeAge,
    emp.payFrequency,
    annualMedicalCredit
  );
  return paye > 0 ? bankersRound(paye, 2) : 0;
};

export const isFullPeriod = (
  frequency: "Monthly" | "Weekly" | "Bi-Weekly",
  start: Date,
  end: Date
): boolean => {
  if (frequency === "Monthly") {
    return (
      isSameMonth(start, end) &&
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

const getPeriodProrationFactor = (
  frequency: "Monthly" | "Weekly" | "Bi-Weekly",
  periodStart: Date,
  periodEnd: Date
): number => {
  if (isFullPeriod(frequency, periodStart, periodEnd)) return 1;
  const actualDays = differenceInCalendarDays(periodEnd, periodStart) + 1;
  const expectedDays = frequency === "Weekly" ? 7 : frequency === "Bi-Weekly" ? 14 : 30;
  return Math.min(1, actualDays / expectedDays);
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
  payrollSavingsEntries: PayrollSavingsEntry[] | null,
  earningComponents?: unknown[],
  deductionComponents?: { id: string; name?: string; amount?: number; amountType?: string }[],
  assignments?: {
    componentType?: string;
    employeeId?: string;
    componentId?: string;
    overrideAmount?: number | null;
    effectiveStart?: string | null;
    effectiveEnd?: string | null;
  }[]
) => {
  let totalDeductions = 0;
  const deductionsBreakdown: { name: string; amount: number }[] = [];
  const savingPaymentsToRecord: { planId: string; employeeId: string; amount: number }[] = [];

  const uif = computeUIF(grossEarnings, taxTables.uifSdlRates, emp, userTaxSettings);

  // COMP-08: pre-tax retirement-fund contribution (Section 11F). The full
  // employee contribution is withheld from net pay, but only the deductible
  // portion (within the 27.5% / R350,000-a-year caps) reduces the PAYE base.
  const retirementProration = getPeriodProrationFactor(
    emp.payFrequency ?? "Monthly",
    periodStart,
    periodEnd
  );
  const retirement = computeRetirementContribution(
    grossEarnings,
    emp,
    emp.payFrequency,
    retirementProration
  );

  // PAYE is levied on remuneration. The employee UIF contribution is NOT
  // deductible for income tax, so it must not reduce the PAYE taxable base.
  // Pre-tax retirement-fund contributions DO reduce it (capped per Section 11F).
  const taxableForPAYE = Math.max(0, grossEarnings - retirement.taxDeductible);
  const paye = computePAYE(taxableForPAYE, taxTables, emp, userTaxSettings);

  if (retirement.total > 0) {
    deductionsBreakdown.push({ name: "Retirement Fund", amount: retirement.total });
    totalDeductions += retirement.total;
  }

  deductionsBreakdown.push({ name: "UIF", amount: uif });
  totalDeductions += uif;

  if (paye > 0) {
    deductionsBreakdown.push({ name: "PAYE", amount: paye });
    totalDeductions += paye;
  }

  // SDL is an EMPLOYER levy (Skills Development Levies Act): 1% of leviable
  // remuneration, paid by the employer to SARS. It must NEVER reduce employee
  // net pay, so it is intentionally NOT added to deductionsBreakdown. It is
  // returned separately as an employer-cost figure for statutory reporting
  // (EMP201 / IRP5). The applySdl flag reflects whether the employer is
  // SDL-liable (employers with total annual payroll <= R500,000 are exempt).
  const applySDLFlag = userTaxSettings?.applySdl ?? true;
  const sdlRate = taxTables.uifSdlRates?.sdl_rate ?? 0.01;
  const employerSdl = applySDLFlag ? bankersRound(grossEarnings * sdlRate, 2) : 0;

  loans.forEach((loan) => {
    if (loan.employeeId !== emp.id || loan.status === "completed" || new Date(loan.startDate) > periodEnd) return;

    const freezeStart = loan.freezeStartDate ? parseISO(loan.freezeStartDate) : null;
    const freezeEnd = loan.freezeEndDate ? parseISO(loan.freezeEndDate) : null;

    if (loan.freezeMode === "range" && freezeEnd && freezeEnd < periodStart) {
      loan.freezeMode = null;
      loan.freezeStartDate = null;
      loan.freezeEndDate = null;
      loan.freezeCyclesRemaining = null;
    }

    const isFrozenByRange =
      loan.freezeMode === "range" &&
      freezeStart &&
      freezeEnd &&
      freezeStart <= periodEnd &&
      freezeEnd >= periodStart;

    const isFrozenByCycles = loan.freezeMode === "cycles" && (loan.freezeCyclesRemaining ?? 0) > 0;

    if (isFrozenByRange || isFrozenByCycles) {
      const reason = isFrozenByRange
        ? `Deduction frozen (${format(freezeStart!, "yyyy-MM-dd")} to ${format(freezeEnd!, "yyyy-MM-dd")}) for pay period ${payPeriodString}`
        : `Deduction frozen (${loan.freezeCyclesRemaining} cycle(s) remaining) for pay period ${payPeriodString}`;

      loan.deductionHistory.push({
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: 0,
        type: "pause",
        notes: reason,
      });

      if (isFrozenByCycles) {
        loan.freezeCyclesRemaining = Math.max(0, (loan.freezeCyclesRemaining ?? 0) - 1);
        if ((loan.freezeCyclesRemaining ?? 0) <= 0) {
          loan.freezeMode = null;
          loan.freezeStartDate = null;
          loan.freezeEndDate = null;
          loan.freezeCyclesRemaining = null;
        }
      }
      return;
    }

    if (loan.paused) {
      loan.deductionHistory.push({
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: 0,
        type: "pause",
        notes: `Deduction paused for pay period ${payPeriodString}`,
      });
      loan.paused = false;
      return;
    }

    let deductionAmount = 0;
    const employeePayFrequency = emp.payFrequency;
    if (!employeePayFrequency) return;

    if (loan.frequency === employeePayFrequency.toLowerCase()) {
      deductionAmount = loan.repaymentAmount * getPeriodProrationFactor(employeePayFrequency, periodStart, periodEnd);
    } else if (employeePayFrequency === "Monthly" && loan.frequency === "weekly") {
      deductionAmount =
        loan.repaymentAmount * 4 * getPeriodProrationFactor("Monthly", periodStart, periodEnd);
    } else if (employeePayFrequency === "Bi-Weekly" && loan.frequency === "weekly") {
      deductionAmount =
        loan.repaymentAmount * 2 * getPeriodProrationFactor("Bi-Weekly", periodStart, periodEnd);
    }

    if (deductionAmount > 0) {
      const rounded = bankersRound(deductionAmount, 2);
      deductionsBreakdown.push({ name: "Loan Repayment", amount: rounded });
      totalDeductions += rounded;
      loan.remainingBalance -= rounded;
      loan.deductionHistory.push({
        date: format(periodEnd, "yyyy-MM-dd"),
        amount: rounded,
        type: "deduction",
        notes: `Payroll deduction for pay period ${payPeriodString}`,
      });
      if (loan.remainingBalance <= 0) {
        loan.status = "completed";
        loan.remainingBalance = 0;
      }
    }
  });

  savingPlans.forEach((plan) => {
    if (plan.employeeId !== emp.id || plan.status !== "active" || new Date(plan.startDate) > periodEnd) return;
    if (plan.endDate && new Date(plan.endDate) < periodStart) return;

    const employeePayFrequency = emp.payFrequency;
    if (!employeePayFrequency) return;

    const entryForPlan =
      payrollSavingsEntries?.find((e) => e.planId === plan.id && e.employeeId === emp.id) || null;

    if (entryForPlan?.paused === true) return;

    const baseAmount = entryForPlan
      ? (entryForPlan.overrideAmount ?? entryForPlan.originalAmount)
      : plan.amount;

    let deductionAmount = 0;
    if (plan.frequency === employeePayFrequency.toLowerCase()) {
      deductionAmount = baseAmount * getPeriodProrationFactor(employeePayFrequency, periodStart, periodEnd);
    } else if (employeePayFrequency === "Monthly" && plan.frequency === "weekly") {
      deductionAmount = baseAmount * 4 * getPeriodProrationFactor("Monthly", periodStart, periodEnd);
    } else if (employeePayFrequency === "Bi-Weekly" && plan.frequency === "weekly") {
      deductionAmount = baseAmount * 2 * getPeriodProrationFactor("Bi-Weekly", periodStart, periodEnd);
    }

    if (deductionAmount > 0) {
      const rounded = bankersRound(deductionAmount, 2);
      deductionsBreakdown.push({ name: "Savings", amount: rounded });
      totalDeductions += rounded;
      if (entryForPlan) {
        savingPaymentsToRecord.push({ planId: plan.id, employeeId: emp.id, amount: rounded });
      }
    }
  });

  if (assignments && deductionComponents) {
    const isEffective = (start?: string | null, end?: string | null) => {
      const s = start ? parseISO(start) : null;
      const e = end ? parseISO(end) : null;
      return (!s || s <= periodEnd) && (!e || e >= periodStart);
    };
    const computeAmount = (base: number, type: string) => {
      if (type === "fixed") return base;
      if (type === "percent_of_salary") return ((emp.salary || 0) * base) / 100;
      if (type === "percent_of_hourly") return ((emp.hourlyRate || 0) * base) / 100;
      if (type === "percent_of_gross") return (grossEarnings * base) / 100;
      return base;
    };
    assignments
      .filter(
        (a) =>
          a.componentType === "deduction" &&
          a.employeeId === emp.id &&
          isEffective(a.effectiveStart, a.effectiveEnd)
      )
      .forEach((a) => {
        const comp = deductionComponents.find((c) => c.id === a.componentId);
        if (comp) {
          const amountBase =
            typeof a.overrideAmount === "number" ? a.overrideAmount : Number(comp.amount || 0);
          const amt = bankersRound(computeAmount(amountBase, comp.amountType || "fixed"), 2);
          if (amt > 0) {
            deductionsBreakdown.push({ name: comp.name || "Deduction", amount: amt });
            totalDeductions += amt;
          }
        }
      });
  }

  totalDeductions = sumMoney(deductionsBreakdown.map((d) => d.amount));
  return { deductionsBreakdown, totalDeductions, savingPaymentsToRecord, employerSdl };
};
