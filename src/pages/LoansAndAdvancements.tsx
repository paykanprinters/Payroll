"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useLoansData } from "@/hooks/use-loans-data"; // Import the new hook
import LoanForm from "@/components/loans/LoanForm"; // Import the new form component
import LoanCard from "@/components/loans/LoanCard"; // Import the new card component
import { Loan } from "@/lib/mock-data-interfaces"; // Import Loan interface

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const LoansAndAdvancements: React.FC = () => {
  const { loans, employees, addLoan, getEmployeeName } = useLoansData(); // Use the new hook
  const dataVisualsFontSize = useDataVisualsFontSize();

  const [loanSummaryData, setLoanSummaryData] = useState<{ name: string; totalLoan: number; remaining: number }[]>([]);
  const [loansByEmployeeData, setLoansByEmployeeData] = useState<{ name: string; value: number }[]>([]);
  const [loansByTypeData, setLoansByTypeData] = useState<{ name: string; value: number }[]>([]); // New state for loans by type

  useEffect(() => {
    // Calculate loan summary for BarChart
    const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.loanAmount, 0);
    const totalRemainingBalance = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    setLoanSummaryData([
      { name: "All Loans", totalLoan: totalLoanAmount, remaining: totalRemainingBalance },
    ]);

    // Calculate loans by employee for PieChart (top 5 employees with highest remaining balance)
    const employeeLoanBalances = new Map<string, number>();
    loans.forEach(loan => {
      const employeeName = getEmployeeName(loan.employeeId);
      employeeLoanBalances.set(employeeName, (employeeLoanBalances.get(employeeName) || 0) + loan.remainingBalance);
    });

    const sortedEmployeeLoans = Array.from(employeeLoanBalances.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5) // Top 5
      .map(([name, value]) => ({ name, value }));
    
    setLoansByEmployeeData(sortedEmployeeLoans);

    // Calculate loans by type for PieChart
    const loanTypeCounts = new Map<Loan["loanType"], number>();
    loans.forEach(loan => {
      loanTypeCounts.set(loan.loanType, (loanTypeCounts.get(loan.loanType) || 0) + 1);
    });
    setLoansByTypeData(
      Array.from(loanTypeCounts.entries()).map(([name, value]) => ({ name, value }))
    );

  }, [loans, getEmployeeName]);

  const handleAddLoan = (newLoanData: Omit<Loan, 'id' | 'status' | 'remainingBalance' | 'deductionHistory' | 'paused'>) => {
    addLoan(newLoanData);
  };

  // Helper for PieChart legend formatter
  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalLoansByEmployee = loansByEmployeeData.reduce((sum, entry) => sum + entry.value, 0);
  const totalLoansByType = loansByTypeData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Loans & Advancements</h1>
      <p className="text-lg text-muted-foreground">
        Manage employee loans and advancements, including flexible repayment schedules and controls.
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
                <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
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
            <CardTitle>Loans by Employee (Top 5 Remaining)</CardTitle>
            <CardDescription>Distribution of remaining loan balances among employees.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={loansByEmployeeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {loansByEmployeeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalLoansByEmployee)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loans by Type</CardTitle>
          <CardDescription>Distribution of loans by their categorized type.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={loansByTypeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                labelLine={false}
                style={{ fontSize: dataVisualsFontSize }}
              >
                {loansByTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
              <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
              <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalLoansByType)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Loan/Advancement</CardTitle>
          <CardDescription>
            Enter details for a new loan or advancement to an employee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoanForm employees={employees} onAddLoan={handleAddLoan} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Loans & Advancements</CardTitle>
          <CardDescription>
            Manage active and completed loans for your employees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loans.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
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
          This interface allows you to record loans, manage their deduction schedules (pause/resume), and apply manual payments. The actual deduction from an employee's salary during payroll processing will respect the 'paused' status and update the remaining balance. This front-end provides the configuration and tracking.
        </p>
      </div>
    </div>
  );
};

export default LoansAndAdvancements;