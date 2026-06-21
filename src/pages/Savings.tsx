"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ListChecks, PauseCircle, PiggyBank, Loader2, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, SavingPlan } from "@/lib/mock-data-interfaces";
import SavingsPlanManagerDialog from "@/components/savings/SavingsPlanManagerDialog";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useSavingPlansData } from "@/hooks/use-saving-plans-data";
import SavingsHeader from "@/components/savings/SavingsHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import SavingsFiltersBar from "@/components/savings/SavingsFiltersBar";
import SavingsAddPlanDialog from "@/components/savings/SavingsAddPlanDialog";
import SavingsPlansTable from "@/components/savings/SavingsPlansTable";
import { buildAdminSavingsSummary, AdminSavingsPlanRow } from "@/lib/savings-admin-summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Savings: React.FC = () => {
  const {
    employees,
    savingPlans: initialSavingPlans,
    payrollSavingsEntries,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
    isLoadingSavingPlans,
    isLoadingPayrollSavingsEntries,
    refetchPayrollSavingsEntries,
  } = usePayrollProcessor();

  const { savingPlans, getEmployeeName, getEmployeeCustomId, addSavingPlan, deleteSavingPlan } =
    useSavingPlansData({
      initialSavingPlans,
      employees,
      isMockDataEnabled,
      isAuthenticated,
      isLoadingAuth,
    });

  const dataVisualsFontSize = useDataVisualsFontSize();
  const isLoading = isLoadingSavingPlans || isLoadingPayrollSavingsEntries;

  const [employeeFilterId, setEmployeeFilterId] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | "monthly" | "weekly">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "paused">("all");
  const [search, setSearch] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavingPlan | null>(null);

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    return savingPlans.filter((plan) => {
      if (employeeFilterId !== "all" && plan.employeeId !== employeeFilterId) return false;
      if (frequencyFilter !== "all" && plan.frequency !== frequencyFilter) return false;

      if (statusFilter !== "all") {
        const entry = payrollSavingsEntries?.find((row) => row.planId === plan.id);
        if (statusFilter === "paused") {
          if (!(plan.status === "active" && entry?.paused)) return false;
        } else if (plan.status !== statusFilter) {
          return false;
        }
      }

      if (term.length > 0) {
        const name = getEmployeeName(plan.employeeId).toLowerCase();
        const customId = getEmployeeCustomId(plan.employeeId).toLowerCase();
        const freq = plan.frequency.toLowerCase();
        const id = plan.id.toLowerCase();
        return (
          name.includes(term) ||
          customId.includes(term) ||
          freq.includes(term) ||
          id.includes(term)
        );
      }
      return true;
    });
  }, [
    savingPlans,
    employeeFilterId,
    frequencyFilter,
    statusFilter,
    search,
    payrollSavingsEntries,
    getEmployeeName,
    getEmployeeCustomId,
  ]);

  const summary = useMemo(
    () => buildAdminSavingsSummary(filteredPlans, payrollSavingsEntries),
    [filteredPlans, payrollSavingsEntries]
  );

  const openManager = (row: AdminSavingsPlanRow) => {
    setSelectedPlan(row.plan);
    setManagerOpen(true);
  };

  const handleManagerOpenChange = (open: boolean) => {
    setManagerOpen(open);
    if (!open) {
      setSelectedPlan(null);
      void refetchPayrollSavingsEntries();
    }
  };

  const formatMoney = (value: number) =>
    `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col gap-4">
      <SavingsHeader />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Filter savings plans by employee, frequency, status, or search.</CardDescription>
        </CardHeader>
        <CardContent>
          <SavingsFiltersBar
            employees={employees as MockEmployee[]}
            employeeFilterId={employeeFilterId}
            onEmployeeFilterChange={setEmployeeFilterId}
            frequencyFilter={frequencyFilter}
            onFrequencyFilterChange={setFrequencyFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            search={search}
            onSearchChange={setSearch}
            onAddNewPlanClick={() => setAddOpen(true)}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading savings" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
              <SummaryAccent variant="emerald" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                    <PiggyBank className="h-4 w-4" />
                  </span>
                  Total saved
                </CardTitle>
                <CardDescription className="text-xs">Collected via payroll tracking entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(summary.totalSaved)}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
              <SummaryAccent variant="sky" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                    <Wallet className="h-4 w-4" />
                  </span>
                  Remaining balance
                </CardTitle>
                <CardDescription className="text-xs">Outstanding on tracked savings entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(summary.totalRemaining)}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
              <SummaryAccent variant="orange" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  Active plans
                </CardTitle>
                <CardDescription className="text-xs">
                  {summary.pausedPlanCount > 0
                    ? `${summary.pausedPlanCount} paused · ${summary.completedPlanCount} completed`
                    : `${summary.completedPlanCount} completed in view`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.activePlanCount}</div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
              <SummaryAccent variant="amber" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  Scheduled deductions
                </CardTitle>
                <CardDescription className="text-xs">
                  Sum of active, non-paused plan amounts (per plan frequency)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMoney(summary.activeScheduledAmount)}</div>
              </CardContent>
            </Card>
          </div>

          {summary.pausedPlanCount > 0 && (
            <Alert className="border-amber-200 bg-amber-50/80">
              <PauseCircle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-900">Paused deductions</AlertTitle>
              <AlertDescription className="text-amber-800/90">
                {summary.pausedPlanCount} active plan
                {summary.pausedPlanCount === 1 ? "" : "s"} currently paused — payroll will skip these until
                unpaused in Manage.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
              <SummaryAccent variant="sky" />
              <CardHeader>
                <CardTitle>Tracking status</CardTitle>
                <CardDescription>
                  Savings entry status for filtered plans (opens when Manage is used).
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {summary.statusChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No savings plans in this view.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                      <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
                      <Tooltip
                        contentStyle={{ fontSize: dataVisualsFontSize }}
                        labelStyle={{ fontSize: dataVisualsFontSize }}
                      />
                      <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                      <Bar dataKey="value" fill="#0891b2" name="Plans / entries" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
              <SummaryAccent variant="emerald" />
              <CardHeader>
                <CardTitle>Active schedules by frequency</CardTitle>
                <CardDescription>Total scheduled amount per frequency (active, non-paused).</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {summary.frequencyChartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No active schedules in this view.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.frequencyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                      <YAxis
                        tickFormatter={(value: number) => `R ${value.toLocaleString("en-ZA")}`}
                        style={{ fontSize: dataVisualsFontSize }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatMoney(value)}
                        contentStyle={{ fontSize: dataVisualsFontSize }}
                        labelStyle={{ fontSize: dataVisualsFontSize }}
                      />
                      <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                      <Bar dataKey="amount" fill="#10b981" name="Scheduled amount" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md">
            <SummaryAccent variant="sky" />
            <CardHeader>
              <CardTitle>Savings plans</CardTitle>
              <CardDescription>
                Plan schedules plus payroll tracking. Use Manage to record payments, pause deductions, or set
                overrides.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SavingsPlansTable
                rows={summary.rows}
                getEmployeeName={getEmployeeName}
                getEmployeeCustomId={getEmployeeCustomId}
                onManage={openManager}
                onDelete={(row) => deleteSavingPlan(row.plan)}
              />
            </CardContent>
          </Card>
        </>
      )}

      <SavingsAddPlanDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        employees={employees as MockEmployee[]}
        onAddPlan={(plan) => addSavingPlan(plan)}
      />

      <SavingsPlanManagerDialog
        open={managerOpen}
        onOpenChange={handleManagerOpenChange}
        plan={selectedPlan}
        employeeName={selectedPlan ? getEmployeeName(selectedPlan.employeeId) : ""}
      />

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How savings deductions work</p>
          <p className="mt-2">
            Plans define the recurring schedule. Payroll applies deductions when payslips are processed, matching
            employee pay frequency. Open <strong>Manage</strong> on a plan to create its tracking entry, record
            payments, pause deductions, or set an override amount. Until Manage is used once, deductions still run
            but collected amounts may show as &quot;Not tracked&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Savings;
