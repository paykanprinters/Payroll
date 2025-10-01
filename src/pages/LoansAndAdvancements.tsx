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
import { MockEmployee, Loan } from "@/lib/mock-data-interfaces"; // Updated import

const loanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  loanAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").transform(Number).refine(val => val > 0, "Loan amount must be positive"),
  repaymentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").transform(Number).refine(val => val > 0, "Repayment amount must be positive"),
  frequency: z.enum(["monthly", "weekly"], { message: "Repayment frequency is required" }),
  startDate: z.string().min(1, "Start date is required"),
});

type LoanFormValues = z.infer<typeof loanSchema>;

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const LoansAndAdvancements: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanSummaryData, setLoanSummaryData] = useState<{ name: string; totalLoan: number; remaining: number }[]>([]);
  const [loansByEmployeeData, setLoansByEmployeeData] = useState<{ name: string; value: number }[]>([]);

  const dataVisualsFontSize = useDataVisualsFontSize();

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      employeeId: "",
      loanAmount: 0,
      repaymentAmount: 0,
      frequency: "monthly",
      startDate: new Date().toISOString().split('T')[0], // Default to current date
    },
  });

  const loadData = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      setEmployees([]);
    }

    const storedLoans = localStorage.getItem("mockLoans");
    if (storedLoans) {
      const loadedLoans: Loan[] = JSON.parse(storedLoans);
      setLoans(loadedLoans);

      // Calculate loan summary for BarChart
      const totalLoanAmount = loadedLoans.reduce((sum, loan) => sum + loan.loanAmount, 0);
      const totalRemainingBalance = loadedLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
      setLoanSummaryData([
        { name: "All Loans", totalLoan: totalLoanAmount, remaining: totalRemainingBalance },
      ]);

      // Calculate loans by employee for PieChart (top 5 employees with highest remaining balance)
      const employeeLoanBalances = new Map<string, number>();
      loadedLoans.forEach(loan => {
        const employeeName = getEmployeeName(loan.employeeId);
        employeeLoanBalances.set(employeeName, (employeeLoanBalances.get(employeeName) || 0) + loan.remainingBalance);
      });

      const sortedEmployeeLoans = Array.from(employeeLoanBalances.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) // Top 5
        .map(([name, value]) => ({ name, value }));
      
      setLoansByEmployeeData(sortedEmployeeLoans);

    } else {
      setLoans([]);
      setLoanSummaryData([]);
      setLoansByEmployeeData([]);
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

  const onSubmit = (data: LoanFormValues) => {
    const newLoan: Loan = {
      id: `LOAN-${Date.now()}`,
      employeeId: data.employeeId,
      loanAmount: data.loanAmount,
      repaymentAmount: data.repaymentAmount,
      frequency: data.frequency,
      startDate: data.startDate,
      remainingBalance: data.loanAmount, // Initially, remaining balance is the full loan amount
    };

    const updatedLoans = [...loans, newLoan];
    setLoans(updatedLoans);
    localStorage.setItem("mockLoans", JSON.stringify(updatedLoans));
    showSuccess("Loan added successfully!");
    form.reset();
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components that data has changed
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Loans & Advancements</h1>
      <p className="text-lg text-muted-foreground">
        Manage employee loans and advancements, including repayment schedules.
      </p>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Overview</CardTitle>
            <CardDescription>Total loan amounts vs. remaining balances.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loanSummaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="totalLoan" fill="#8884d8" name="Total Loan Amount" />
                <Bar dataKey="remaining" fill="#82ca9d" name="Remaining Balance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loans by Employee (Top 5)</CardTitle>
            <CardDescription>Distribution of remaining loan balances among employees.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loansByEmployeeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {loansByEmployeeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Loan/Advancement</CardTitle>
          <CardDescription>
            Enter details for a new loan or advancement to an employee.
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
              <Label htmlFor="loanAmount">Loan Amount (R)</Label>
              <Input
                id="loanAmount"
                type="number"
                step="0.01"
                {...form.register("loanAmount")}
                className="mt-1"
              />
              {form.formState.errors.loanAmount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.loanAmount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="repaymentAmount">Repayment Amount per Period (R)</Label>
              <Input
                id="repaymentAmount"
                type="number"
                step="0.01"
                {...form.register("repaymentAmount")}
                className="mt-1"
              />
              {form.formState.errors.repaymentAmount && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.repaymentAmount.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="frequency">Repayment Frequency</Label>
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

            <Button type="submit" className="w-full">Add Loan</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Loans & Advancements</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Repayment</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{getEmployeeName(loan.employeeId)}</TableCell>
                    <TableCell>R {loan.loanAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>R {loan.repaymentAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{loan.frequency}</TableCell>
                    <TableCell>{loan.startDate}</TableCell>
                    <TableCell className="text-right">R {loan.remainingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No loans or advancements recorded.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Loan Deductions:</h3>
        <p className="text-sm">
          This interface allows you to record loans and their repayment schedules. The actual deduction from an employee's salary and the update of the remaining balance would be handled by the backend payroll processing logic when payslips are generated. This front-end provides the configuration.
        </p>
      </div>
    </div>
  );
};

export default LoansAndAdvancements;