import { MockEmployee, MockPayslip, SavingPlan } from "@/lib/mock-data-interfaces";
import { PayrollSavingsEntry, SavingsStatus, savingsTrackingStatus } from "@/lib/savings-types";

export type StaffSavingsDisplayStatus =
  | "active"
  | "completed"
  | "paused"
  | "pending"
  | "paid";

export interface StaffSavingsPlanRow {
  plan: SavingPlan;
  entry: PayrollSavingsEntry | null;
  effectiveAmount: number;
  perPaycheckAmount: number;
  amountPaid: number | null;
  remainingBalance: number | null;
  isPaused: boolean;
  displayStatus: StaffSavingsDisplayStatus;
  entryStatus: SavingsStatus | null;
}

export interface StaffSavingsDeductionRow {
  payslipId: string;
  payPeriod: string;
  payDate: string;
  amount: number;
}

export interface StaffSavingsSummary {
  activePlanCount: number;
  pausedPlanCount: number;
  totalSaved: number;
  perPaycheckDeductions: number;
  plans: StaffSavingsPlanRow[];
  recentDeductions: StaffSavingsDeductionRow[];
}

/** Mirrors payroll deduction frequency matching in deductions-helpers.ts */
export function normalizeSavingsDeductionPerPayPeriod(
  planAmount: number,
  planFrequency: SavingPlan["frequency"],
  employeePayFrequency: string | undefined
): number {
  if (!employeePayFrequency) return planAmount;
  const emp = employeePayFrequency.toLowerCase();
  const plan = planFrequency.toLowerCase();
  if (plan === emp) return planAmount;
  if (emp === "monthly" && plan === "weekly") return planAmount * 4;
  if (emp === "bi-weekly" && plan === "weekly") return planAmount * 2;
  return 0;
}

function resolveDisplayStatus(
  plan: SavingPlan,
  entry: PayrollSavingsEntry | null
): StaffSavingsDisplayStatus {
  if (plan.status === "completed") return "completed";
  if (!entry) return plan.status === "active" ? "active" : "completed";
  const tracking = savingsTrackingStatus(entry, plan.endDate);
  if (tracking === "paid") return "paid";
  if (tracking === "paused") return "paused";
  if (plan.status === "active") return "pending";
  return "completed";
}

function sumPayslipSavingsDeductions(employeeId: string, payslips: MockPayslip[]): number {
  return payslips
    .filter((p) => p.employeeId === employeeId)
    .reduce((sum, payslip) => {
      const savingsLines =
        payslip.deductionsBreakdown?.filter((line) => line.name === "Savings") ?? [];
      return sum + savingsLines.reduce((lineSum, line) => lineSum + line.amount, 0);
    }, 0);
}

export function buildStaffSavingsSummary(
  employee: MockEmployee,
  savingPlans: SavingPlan[],
  payrollSavingsEntries: PayrollSavingsEntry[] | null,
  payslips: MockPayslip[]
): StaffSavingsSummary {
  const myEntries =
    payrollSavingsEntries?.filter((entry) => entry.employeeId === employee.id) ?? [];

  const plans: StaffSavingsPlanRow[] = savingPlans
    .filter((plan) => plan.employeeId === employee.id)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return b.startDate.localeCompare(a.startDate);
    })
    .map((plan) => {
      const entry = myEntries.find((row) => row.planId === plan.id) ?? null;
      const effectiveAmount = entry
        ? (entry.overrideAmount ?? entry.originalAmount)
        : plan.amount;
      const isPaused = !!entry?.paused && plan.status === "active";
      const perPaycheckAmount =
        plan.status === "active" && !isPaused
          ? normalizeSavingsDeductionPerPayPeriod(
              effectiveAmount,
              plan.frequency,
              employee.payFrequency
            )
          : 0;

      return {
        plan,
        entry,
        effectiveAmount,
        perPaycheckAmount,
        amountPaid: entry ? entry.amountPaid : null,
        remainingBalance: entry ? entry.remainingBalance : null,
        isPaused,
        displayStatus: resolveDisplayStatus(plan, entry),
        entryStatus: entry?.status ?? null,
      };
    });

  const activePlans = plans.filter((row) => row.plan.status === "active");
  const pausedPlanCount = activePlans.filter((row) => row.isPaused).length;

  const perPaycheckDeductions = activePlans
    .filter((row) => !row.isPaused)
    .reduce((sum, row) => sum + row.perPaycheckAmount, 0);

  const entryTotalSaved = myEntries.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);
  const payslipSavingsTotal = sumPayslipSavingsDeductions(employee.id, payslips);
  const totalSaved = entryTotalSaved > 0 ? entryTotalSaved : payslipSavingsTotal;

  const recentDeductions = payslips
    .filter((payslip) => payslip.employeeId === employee.id)
    .map((payslip) => {
      const amount = (payslip.deductionsBreakdown ?? [])
        .filter((line) => line.name === "Savings")
        .reduce((sum, line) => sum + line.amount, 0);
      if (amount <= 0) return null;
      return {
        payslipId: payslip.id,
        payPeriod: payslip.payPeriod,
        payDate: payslip.payDate ?? "",
        amount,
      };
    })
    .filter((row): row is StaffSavingsDeductionRow => row !== null)
    .sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))
    .slice(0, 6);

  return {
    activePlanCount: activePlans.length,
    pausedPlanCount,
    totalSaved,
    perPaycheckDeductions,
    plans,
    recentDeductions,
  };
}
