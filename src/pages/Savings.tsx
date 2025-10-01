"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { MockEmployee, SavingPlan } from "@/lib/mock-data-interfaces"; // Updated import

const savingPlanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").transform(Number).refine(val => val > 0, "Savings amount must be positive"),
  frequency: z.enum(["monthly", "weekly"], { message: "Deduction frequency is required" }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

type SavingPlanFormValues = z.infer<typeof savingPlanSchema>;

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Savings: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [totalSavingsData, setTotalSavingsData] = useState<{ name: string; amount: number }[]>([]);
  const [savingsByFrequencyData, setSavingsByFrequencyData] = useState<{ name: string; value: number }[]>([]);

  const dataVisualsFontSize = useDataVisualsFontSize();

  const form = useForm<SavingPlanFormValues>({
    resolver: zodResolver(savingPlanSchema),
    defaultValues: {
      employeeId: "",
      amount: 0,
      frequency: "monthly",
      startDate: new Date().toISOString().split('T')[0], // Default to current date
      endDate: "",
    },
  });

  const loadData = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      setEmployees([]);
    }

    const storedSavingPlans = localStorage.getItem("mockSavingPlans");
    if (storedSavingPlans) {
      const loadedSavingPlans: SavingPlan[] = JSON.parse(storedSavingPlans);
      setSavingPlans(loadedSavingPlans);

      // Calculate total savings for BarChart
      const totalAmount = loadedSavingPlans.reduce((sum, plan) => sum + plan.amount, 0);
      setTotalSavingsData([
        { name: "Total Active Savings", amount: totalAmount },
      ]);

      // Calculate savings by frequency for PieChart
      const frequencyMap = new Map<string, number>();
      loadedSavingPlans.forEach(plan => {
        frequencyMap.set(plan.frequency, (frequencyMap.get(plan.frequency) || 0) + 1);
      });
      setSavingsByFrequencyData(
        Array.from(frequencyMap.entries()).map(([name, value]) => ({ name, value }))
      );

    } else {
      setSavingPlans([]);
      setTotalSavingsData([]);
      setSavingsByFrequencyData([]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mockDataUpdated', loadData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadData);
    };
  }, []);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const onSubmit = (data: SavingPlanFormValues) => {
    const newSavingPlan: SavingPlan = {
      id: `SAV-${Date.now()}`,
      employeeId: data.employeeId,
      amount: data.amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      status: "active",
    };

    const updatedSavingPlans = [...savingPlans, newSavingPlan];
    setSavingPlans(updatedSavingPlans);
    localStorage.setItem("mockSavingPlans", JSON.stringify(updatedSavingPlans));
    showSuccess("Savings plan added successfully!");
    form.reset();
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components that data has changed
  };

  // Helper for PieChart legend formatter
  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalSavingsFrequency = savingsByFrequencyData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Employee Savings</h1>
      <p className="text-lg text-muted-foreground">
        Manage employee savings deductions from their salaries.
      </p>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Active Savings Contributions</CardTitle>
            <CardDescription>Overview of the total amount being saved by employees.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totalSavingsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="amount" fill="#8884d8" name="Total Savings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
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
                  innerRadius={60} // Added for Doughnut
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false} // Ensure no lines to labels
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

      <Card>
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
                <SelectTrigger id="employeeId" className="mt-1">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.id})
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
                className="mt-1"
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
                <SelectTrigger id="frequency" className="mt-1">
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
                className="mt-1"
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
                className="mt-1"
              />
              {form.formState.errors.endDate && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full">Add Savings Plan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Savings Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {savingPlans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savingPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{getEmployeeName(plan.employeeId)}</TableCell>
                    <TableCell>R {plan.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{plan.frequency}</TableCell>
                    <TableCell>{plan.startDate}</TableCell>
                    <TableCell>{plan.endDate || "N/A"}</TableCell>
                    <TableCell>{plan.status}</TableCell>
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