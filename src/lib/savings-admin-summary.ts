import { SavingPlan } from "@/lib/mock-data-interfaces";
import { PayrollSavingsEntry, SavingsStatus, savingsTrackingStatus } from "@/lib/savings-types";
import { computeSavingsStatusSummary } from "@/lib/dashboard-metrics";

export interface AdminSavingsPlanRow {
  plan: SavingPlan;
  entry: PayrollSavingsEntry | null;
}

export interface AdminSavingsSummary {
  activePlanCount: number;
  pausedPlanCount: number;
  completedPlanCount: number;
  totalSaved: number;
  totalRemaining: number;
  activeScheduledAmount: number;
  statusChartData: { name: string; value: number }[];
  frequencyChartData: { name: string; amount: number; count: number }[];
  rows: AdminSavingsPlanRow[];
}

function entryForPlan(
  entries: PayrollSavingsEntry[] | null,
  plan: SavingPlan
): PayrollSavingsEntry | null {
  return entries?.find((entry) => entry.planId === plan.id && entry.employeeId === plan.employeeId) ?? null;
}

export function buildAdminSavingsSummary(
  plans: SavingPlan[],
  payrollSavingsEntries: PayrollSavingsEntry[] | null
): AdminSavingsSummary {
  const rows: AdminSavingsPlanRow[] = plans.map((plan) => ({
    plan,
    entry: entryForPlan(payrollSavingsEntries, plan),
  }));

  const activeRows = rows.filter((row) => row.plan.status === "active");
  const pausedPlanCount = activeRows.filter((row) => row.entry?.paused).length;
  const completedPlanCount = rows.filter((row) => row.plan.status === "completed").length;

  const scopedEntries =
    payrollSavingsEntries
      ?.filter((entry) => plans.some((plan) => plan.id === entry.planId))
      .map((entry) => {
        const plan = plans.find((item) => item.id === entry.planId);
        return { ...entry, status: savingsTrackingStatus(entry, plan?.endDate) };
      }) ?? [];

  const totalSaved = scopedEntries.reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);
  const totalRemaining = scopedEntries.reduce(
    (sum, entry) => sum + (entry.remainingBalance || 0),
    0
  );

  const activeScheduledAmount = activeRows
    .filter((row) => !row.entry?.paused)
    .reduce((sum, row) => sum + row.plan.amount, 0);

  const entryStatus = computeSavingsStatusSummary(scopedEntries);
  const statusChartData =
    entryStatus.chartData.length > 0
      ? entryStatus.chartData
      : buildPlanStatusChartData(rows);

  const frequencyMap = new Map<string, { amount: number; count: number }>();
  activeRows.forEach((row) => {
    const key = row.plan.frequency;
    const current = frequencyMap.get(key) ?? { amount: 0, count: 0 };
    frequencyMap.set(key, {
      amount: current.amount + row.plan.amount,
      count: current.count + 1,
    });
  });

  const frequencyChartData = Array.from(frequencyMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));

  return {
    activePlanCount: activeRows.length,
    pausedPlanCount,
    completedPlanCount,
    totalSaved,
    totalRemaining,
    activeScheduledAmount,
    statusChartData,
    frequencyChartData,
    rows,
  };
}

function buildPlanStatusChartData(rows: AdminSavingsPlanRow[]): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key =
      row.plan.status === "active" && row.entry?.paused ? "paused" : row.plan.status;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

export function formatSavingsStatusLabel(status: SavingsStatus | string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
