"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CalendarClock, ListChecks } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, SavingPlan } from "@/lib/mock-data-interfaces";
import SavingsPlanManagerDialog from "@/components/savings/SavingsPlanManagerDialog";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useSavingPlansData } from "@/hooks/use-saving-plans-data";
import SavingsHeader from "@/components/savings/SavingsHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import SavingsFiltersBar from "@/components/savings/SavingsFiltersBar";
import SavingsAddForm from "@/components/savings/SavingsAddForm";
import SavingsPlansTable from "@/components/savings/SavingsPlansTable";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Savings: React.FC = () => {
  const { employees, savingPlans: initialSavingPlans, isMockDataEnabled, isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { savingPlans, getEmployeeName, getEmployeeCustomId, addSavingPlan, deleteSavingPlan } = useSavingPlansData({ initialSavingPlans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const dataVisualsFontSize = useDataVisualsFontSize();

  // Filters state
  const [employeeFilterId, setEmployeeFilterId] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<"all" | "monthly" | "weekly">("all");
  const [search, setSearch] = useState<string>("");

  // Add form drawer
  const [addOpen, setAddOpen] = useState(false);

  // Manager dialog
  const [managerOpen, setManagerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavingPlan | null>(null);

  const openManager = (plan: SavingPlan) => {
    setSelectedPlan(plan);
    setManagerOpen(true);
  };

  // Derived: filtered plans
  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    return savingPlans.filter(plan => {
      if (employeeFilterId !== "all" && plan.employeeId !== employeeFilterId) return false;
      if (frequencyFilter !== "all" && plan.frequency !== frequencyFilter) return false;

      if (term.length > 0) {
        const name = getEmployeeName(plan.employeeId).toLowerCase();
        const customId = getEmployeeCustomId(plan.employeeId).toLowerCase();
        const freq = plan.frequency.toLowerCase();
        const id = plan.id.toLowerCase();
        return name.includes(term) || customId.includes(term) || freq.includes(term) || id.includes(term);
      }
      return true;
    });
  }, [savingPlans, employeeFilterId, frequencyFilter, search, getEmployeeName, getEmployeeCustomId]);

  // Charts data based on filtered plans
  const [totalSavingsData, setTotalSavingsData] = useState<{ name: string; amount: number }[]>([]);
  const [savingsByFrequencyData, setSavingsByFrequencyData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (filteredPlans.length > 0) {
      const totalAmount = filteredPlans.reduce((sum, plan) => sum + plan.amount, 0);
      setTotalSavingsData([{ name: "Total Active Savings", amount: totalAmount }]);

      const frequencyMap = new Map<string, number>();
      filteredPlans.forEach(plan => {
        frequencyMap.set(plan.frequency, (frequencyMap.get(plan.frequency) || 0) + 1);
      });
      setSavingsByFrequencyData(Array.from(frequencyMap.entries()).map(([name, value]) => ({ name, value })));
    } else {
      setTotalSavingsData([]);
      setSavingsByFrequencyData([]);
    }
  }, [filteredPlans]);

  const totalSavingsFrequency = savingsByFrequencyData.reduce((sum, entry) => sum + entry.value, 0);

  // KPIs (filtered)
  const totalActiveAmount = totalSavingsData[0]?.amount || 0;
  const totalPlansCount = filteredPlans.length;
  const monthlyCount = savingsByFrequencyData.find(d => d.name === "monthly")?.value || 0;
  const weeklyCount = savingsByFrequencyData.find(d => d.name === "weekly")?.value || 0;

  return (
    <div className="flex flex-col gap-4">
      <SavingsHeader />

      {/* Filters */}
      <Card className="border rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Filter savings plans by employee, frequency, or search.</CardDescription>
        </CardHeader>
        <CardContent>
          <SavingsFiltersBar
            employees={employees as MockEmployee[]}
            employeeFilterId={employeeFilterId}
            onEmployeeFilterChange={setEmployeeFilterId}
            frequencyFilter={frequencyFilter}
            onFrequencyFilterChange={setFrequencyFilter}
            search={search}
            onSearchChange={setSearch}
            onAddNewPlanClick={() => setAddOpen(true)}
          />
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <DollarSign className="h-4 w-4" />
              </span>
              Total Active Savings
            </CardTitle>
            <CardDescription className="text-xs">Sum of filtered contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {totalActiveAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="emerald" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                <ListChecks className="h-4 w-4" />
              </span>
              Total Plans
            </CardTitle>
            <CardDescription className="text-xs">Filtered savings plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlansCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="orange" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              Monthly Plans
            </CardTitle>
            <CardDescription className="text-xs">Recurring monthly deductions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="amber" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              Weekly Plans
            </CardTitle>
            <CardDescription className="text-xs">Recurring weekly deductions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
          <CardHeader>
            <CardTitle>Total Active Savings Contributions</CardTitle>
            <CardDescription>Overview of the total amount from filtered employees.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalSavingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="amount" fill="#8884d8" name="Total Savings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="emerald" />
          <CardHeader>
            <CardTitle>Savings Plans by Frequency</CardTitle>
            <CardDescription>Distribution among filtered plans.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={savingsByFrequencyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {savingsByFrequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Current plans */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle>Current Savings Plans</CardTitle>
          <CardDescription>Manage, update, or delete savings plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <SavingsPlansTable
            plans={filteredPlans}
            getEmployeeName={getEmployeeName}
            getEmployeeCustomId={getEmployeeCustomId}
            onManage={openManager}
            onDelete={deleteSavingPlan}
          />
        </CardContent>
      </Card>

      {/* Add New Plan Drawer */}
      <Drawer open={addOpen} onOpenChange={setAddOpen}>
        <DrawerContent className="p-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Add New Savings Plan</DrawerTitle>
          </DrawerHeader>
          <SavingsAddForm
            employees={employees as MockEmployee[]}
            onAddPlan={(plan) => addSavingPlan(plan)}
            onClose={() => setAddOpen(false)}
          />
        </DrawerContent>
      </Drawer>

      {/* Manager Dialog */}
      <SavingsPlanManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        plan={selectedPlan}
        employeeName={selectedPlan ? getEmployeeName(selectedPlan.employeeId) : ""}
      />

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Savings Deductions:</h3>
        <p className="text-sm">
          This interface records employee savings plans and schedules. Actual deductions occur in backend payroll processing when payslips are generated.
        </p>
      </div>
    </div>
  );
};

export default Savings;