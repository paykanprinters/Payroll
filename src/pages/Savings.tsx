"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { showSuccess, showError } from "@/utils/toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, SavingPlan } from "@/lib/mock-data-interfaces";
import SavingsPlanManagerDialog from "@/components/savings/SavingsPlanManagerDialog";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useSavingPlansData } from "@/hooks/use-saving-plans-data";
import SavingsHeader from "@/components/savings/SavingsHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { DollarSign, CalendarClock, ListChecks } from "lucide-react";

const savingPlanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.preprocess(
    (val) => (val === "" || isNaN(Number(val))) ? 0 : Number(val),
    z.number().min(1, "Savings amount must be positive")
  ),
  frequency: z.enum(["monthly", "weekly"], { message: "Deduction frequency is required" }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

type SavingPlanFormValues = z.infer<typeof savingPlanSchema>;

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Savings: React.FC = () => {
  const { employees, savingPlans: initialSavingPlans, isMockDataEnabled, isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { savingPlans, getEmployeeName, getEmployeeCustomId, addSavingPlan, deleteSavingPlan } = useSavingPlansData({ initialSavingPlans, employees, isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const dataVisualsFontSize = useDataVisualsFontSize();

  const [totalSavingsData, setTotalSavingsData] = useState<{ name: string; amount: number }[]>([]);
  const [savingsByFrequencyData, setSavingsByFrequencyData] = useState<{ name: string; value: number }[]>([]);

  const form = useForm<SavingPlanFormValues>({
    resolver: zodResolver(savingPlanSchema),
    defaultValues: {
      employeeId: "",
      amount: 0,
      frequency: "monthly",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
    },
  });

  const [managerOpen, setManagerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavingPlan | null>(null);

  const openManager = (plan: SavingPlan) => {
    setSelectedPlan(plan);
    setManagerOpen(true);
  };

  useEffect(() => {
    if (savingPlans.length > 0) {
      const totalAmount = savingPlans.reduce((sum, plan) => sum + plan.amount, 0);
      setTotalSavingsData([
        { name: "Total Active Savings", amount: totalAmount },
      ]);

      const frequencyMap = new Map<string, number>();
      savingPlans.forEach(plan => {
        frequencyMap.set(plan.frequency, (frequencyMap.get(plan.frequency) || 0) + 1);
      });
      setSavingsByFrequencyData(
        Array.from(frequencyMap.entries()).map(([name, value]) => ({ name, value }))
      );

    } else {
      setTotalSavingsData([]);
      setSavingsByFrequencyData([]);
    }
  }, [savingPlans]);

  const onSubmit = (data: SavingPlanFormValues) => {
    const planToSave: Omit<SavingPlan, 'id' | 'status'> = {
      employeeId: data.employeeId,
      amount: data.amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
    };
    addSavingPlan(planToSave);
    form.reset();
  };

  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalSavingsFrequency = savingsByFrequencyData.reduce((sum, entry) => sum + entry.value, 0);

  // Simple KPIs
  const totalActiveAmount = totalSavingsData[0]?.amount || 0;
  const totalPlansCount = savingPlans.length;
  const monthlyCount = savingsByFrequencyData.find(d => d.name === "monthly")?.value || 0;
  const weeklyCount = savingsByFrequencyData.find(d => d.name === "weekly")?.value || 0;

  return (
    <div className="flex flex-col gap-4">
      <SavingsHeader />

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
            <CardDescription className="text-xs">Sum of all active contributions</CardDescription>
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
            <CardDescription className="text-xs">All recorded savings plans</CardDescription>
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
            <CardDescription>Overview of the total amount being saved by employees.</CardDescription>
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
            <CardDescription>Distribution of savings plans based on their deduction frequency.</CardDescription>
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
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalSavingsFrequency)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="orange" />
        <CardHeader>
          <CardTitle>Add New Savings Plan</CardTitle>
          <CardDescription>
            Set up a new recurring savings deduction for an employee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="employeeId">Employee</Label>
              <Select
                onValueChange={(value) => form.setValue("employeeId", value)}
                value={form.watch("employeeId")}
              >
                <SelectTrigger id="employeeId" className="mt-1 rounded-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-employees" disabled>
                      No employees available (enable mock data)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.employeeId && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="amount">Savings Amount per Period (R)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register("amount")}
                className="mt-1 rounded-full"
              />
              {form.formState.errors.amount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="frequency">Deduction Frequency</Label>
              <Select
                onValueChange={(value) => form.setValue("frequency", value as "monthly" | "weekly")}
                value={form.watch("frequency")}
              >
                <SelectTrigger id="frequency" className="mt-1 rounded-full">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.frequency && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.frequency.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="startDate">Start Date of Deductions</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
                className="mt-1 rounded-full"
              />
              {form.formState.errors.startDate && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">End Date of Deductions (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                className="mt-1 rounded-full"
              />
              {form.formState.errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full rounded-full">Add Savings Plan</Button>
          </form>
        </CardContent>
      </Card>

      {/* Current plans */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle>Current Savings Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {savingPlans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savingPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{getEmployeeCustomId(plan.employeeId)}</TableCell>
                    <TableCell>{getEmployeeName(plan.employeeId)}</TableCell>
                    <TableCell>R {plan.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{plan.frequency}</TableCell>
                    <TableCell>{plan.startDate}</TableCell>
                    <TableCell>{plan.endDate || "N/A"}</TableCell>
                    <TableCell>{plan.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openManager(plan)} className="rounded-full">
                          Manage
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="rounded-full">
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete savings plan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the savings plan for {getEmployeeName(plan.employeeId)} ({getEmployeeCustomId(plan.employeeId)}).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSavingPlan(plan)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No savings plans recorded.
            </div>
          )}
        </CardContent>
      </Card>

      <SavingsPlanManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        plan={selectedPlan}
        employeeName={selectedPlan ? getEmployeeName(selectedPlan.employeeId) : ""}
      />

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Savings Deductions:</h3>
        <p className="text-sm">
          This interface allows you to record employee savings plans and their deduction schedules. The actual deduction from an employee's salary would be handled by the backend payroll processing logic when payslips are generated. This front-end provides the configuration.
        </p>
      </div>
    </div>
  );
};

export default Savings;