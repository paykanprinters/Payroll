"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data-interfaces";
import { format, differenceInMonths, differenceInYears } from "date-fns";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const Analytics: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [payslips, setPayslips] = useState<MockPayslip[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);

  const [monthlyPayrollTrend, setMonthlyPayrollTrend] = useState<{ name: string; gross: number; net: number }[]>([]);
  const [compensationBreakdown, setCompensationBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [deductionCategoryBreakdown, setDeductionCategoryBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [employeeTurnoverTrend, setEmployeeTurnoverTrend] = useState<{ name: string; newHires: number; terminations: number }[]>([]);
  const [leaveTypeDistribution, setLeaveTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [employeeSalaryDistribution, setEmployeeSalaryDistribution] = useState<{ range: string; count: number }[]>([]); // New state
  const [overtimeCostTrend, setOvertimeCostTrend] = useState<{ name: string; overtime: number }[]>([]); // New state
  const [employeeTenureDistribution, setEmployeeTenureDistribution] = useState<{ name: string; value: number }[]>([]); // New state


  const dataVisualsFontSize = useDataVisualsFontSize();

  const loadAnalyticsData = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    const loadedEmployees: MockEmployee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
    setEmployees(loadedEmployees);

    const storedPayslips = localStorage.getItem("mockPayslips");
    const loadedPayslips: MockPayslip[] = storedPayslips ? JSON.parse(storedPayslips) : [];
    setPayslips(loadedPayslips);

    const storedLeaveRecords = localStorage.getItem("mockLeaveRecords");
    const loadedLeaveRecords: LeaveEntry[] = storedLeaveRecords ? JSON.parse(storedLeaveRecords) : [];
    setLeaveRecords(loadedLeaveRecords);

    // --- Monthly Payroll Cost Trend ---
    const monthlyDataMap = new Map<string, { gross: number; net: number }>();
    loadedPayslips.forEach(p => {
      const monthYear = p.payPeriod.substring(0, 7); // "YYYY-MM"
      const current = monthlyDataMap.get(monthYear) || { gross: 0, net: 0 };
      monthlyDataMap.set(monthYear, {
        gross: current.gross + p.grossEarnings,
        net: current.net + p.netPay,
      });
    });
    const trendData = Array.from(monthlyDataMap.entries())
      .map(([monthYear, data]) => ({
        name: format(new Date(monthYear), 'MMM yyyy'),
        gross: data.gross,
        net: data.net,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setMonthlyPayrollTrend(trendData);

    // --- Compensation Type Breakdown ---
    const compensationMap = new Map<string, number>();
    loadedPayslips.forEach(p => {
      p.earningsBreakdown.forEach(e => {
        compensationMap.set(e.name, (compensationMap.get(e.name) || 0) + e.amount);
      });
    });
    setCompensationBreakdown(
      Array.from(compensationMap.entries()).map(([name, value]) => ({ name, value }))
    );

    // --- Deduction Category Breakdown ---
    const statutoryDeductions = ["PAYE", "UIF", "SDL"];
    let totalStatutory = 0;
    let totalOtherDeductions = 0;
    loadedPayslips.forEach(p => {
      p.deductionsBreakdown.forEach(d => {
        if (statutoryDeductions.includes(d.name)) {
          totalStatutory += d.amount;
        } else {
          totalOtherDeductions += d.amount;
        }
      });
    });
    setDeductionCategoryBreakdown([
      { name: "Statutory Deductions", value: totalStatutory },
      { name: "Other Deductions", value: totalOtherDeductions },
    ].filter(item => item.value > 0)); // Only show if there's a value

    // --- Employee Turnover Trend (Mocked for simplicity) ---
    const turnoverMap = new Map<string, { newHires: number; terminations: number }>();
    const currentYear = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => format(new Date(currentYear, i, 1), 'MMM yyyy'));

    months.forEach(month => turnoverMap.set(month, { newHires: 0, terminations: 0 }));

    loadedEmployees.forEach(emp => {
      const hireMonth = format(new Date(emp.startDate), 'MMM yyyy');
      if (turnoverMap.has(hireMonth)) {
        turnoverMap.get(hireMonth)!.newHires++;
      }
      // Mock terminations: every 5th employee hired before current year, 'terminated' in a random month this year
      if (new Date(emp.startDate).getFullYear() < currentYear && parseInt(emp.id.replace('EMP', '')) % 5 === 0) {
        const terminationMonthIndex = Math.floor(Math.random() * (new Date().getMonth() + 1)); // Up to current month
        const terminationMonth = format(new Date(currentYear, terminationMonthIndex, 1), 'MMM yyyy');
        if (turnoverMap.has(terminationMonth)) {
          turnoverMap.get(terminationMonth)!.terminations++;
        }
      }
    });

    setEmployeeTurnoverTrend(
      Array.from(turnoverMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
    );

    // --- Leave Type Distribution ---
    const leaveTypeMap = new Map<string, number>();
    loadedLeaveRecords.forEach(record => {
      leaveTypeMap.set(record.leaveType, (leaveTypeMap.get(record.leaveType) || 0) + record.workingDays);
    });
    setLeaveTypeDistribution(
      Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value }))
    );

    // --- Employee Salary Distribution (New) ---
    const salaryRanges = [
      { range: "R0 - R20k", min: 0, max: 20000, count: 0 },
      { range: "R20k - R40k", min: 20001, max: 40000, count: 0 },
      { range: "R40k - R60k", min: 40001, max: 60000, count: 0 },
      { range: "R60k+", min: 60001, max: Infinity, count: 0 },
    ];
    loadedEmployees.forEach(emp => {
      const effectiveSalary = emp.salary || (emp.hourlyRate ? emp.hourlyRate * 160 : 0); // Estimate monthly for hourly
      for (const range of salaryRanges) {
        if (effectiveSalary >= range.min && effectiveSalary <= range.max) {
          range.count++;
          break;
        }
      }
    });
    setEmployeeSalaryDistribution(salaryRanges.map(r => ({ range: r.range, count: r.count })));

    // --- Overtime Cost Trend (New) ---
    const overtimeTrendMap = new Map<string, number>();
    loadedPayslips.forEach(p => {
      const monthYear = p.payPeriod.substring(0, 7);
      const overtimeEntry = p.earningsBreakdown.find(e => e.name === "Overtime");
      if (overtimeEntry) {
        overtimeTrendMap.set(monthYear, (overtimeTrendMap.get(monthYear) || 0) + overtimeEntry.amount);
      }
    });
    const sortedOvertimeTrend = Array.from(overtimeTrendMap.entries())
      .map(([monthYear, overtime]) => ({
        name: format(new Date(monthYear), 'MMM yyyy'),
        overtime: overtime,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setOvertimeCostTrend(sortedOvertimeTrend);

    // --- Employee Tenure Distribution (New) ---
    const tenureRanges = [
      { name: "< 1 Year", minMonths: 0, maxMonths: 11, count: 0 },
      { name: "1-3 Years", minMonths: 12, maxMonths: 35, count: 0 },
      { name: "3-5 Years", minMonths: 36, maxMonths: 59, count: 0 },
      { name: "5+ Years", minMonths: 60, maxMonths: Infinity, count: 0 },
    ];
    const today = new Date();
    loadedEmployees.forEach(emp => {
      const hireDate = new Date(emp.startDate);
      const monthsSinceHire = differenceInMonths(today, hireDate);
      for (const range of tenureRanges) {
        if (monthsSinceHire >= range.minMonths && monthsSinceHire <= range.maxMonths) {
          range.count++;
          break;
        }
      }
    });
    setEmployeeTenureDistribution(tenureRanges.map(r => ({ name: r.name, value: r.count })));
  };

  useEffect(() => {
    loadAnalyticsData();
    window.addEventListener('mockDataUpdated', loadAnalyticsData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadAnalyticsData);
    };
  }, []);

  // Helper for PieChart legend formatter
  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalCompensation = compensationBreakdown.reduce((sum, entry) => sum + entry.value, 0);
  const totalDeductionCategories = deductionCategoryBreakdown.reduce((sum, entry) => sum + entry.value, 0);
  const totalLeaveDays = leaveTypeDistribution.reduce((sum, entry) => sum + entry.value, 0);
  const totalTenureDistribution = employeeTenureDistribution.reduce((sum, entry) => sum + entry.value, 0);


  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Payroll Analytics</h1>
      <p className="text-lg text-muted-foreground">
        Dive deeper into your payroll data with advanced analysis and trends.
      </p>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payroll Cost Trend</CardTitle>
            <CardDescription>Evolution of total gross and net pay over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyPayrollTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Line type="monotone" dataKey="gross" stroke="#8884d8" name="Gross Pay" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="net" stroke="#82ca9d" name="Net Pay" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compensation Type Breakdown</CardTitle>
            <CardDescription>Distribution of earnings by type (e.g., Basic, Overtime, Bonus).</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compensationBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {compensationBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalCompensation)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deduction Category Breakdown</CardTitle>
            <CardDescription>Comparison of statutory vs. other deductions.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deductionCategoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {deductionCategoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalDeductionCategories)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Turnover Trend</CardTitle>
            <CardDescription>Monthly new hires vs. terminations (mock data).</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeTurnoverTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="newHires" fill="#00C49F" name="New Hires" />
                <Bar dataKey="terminations" fill="#FF8042" name="Terminations" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leave Type Distribution</CardTitle>
            <CardDescription>Breakdown of total working days taken by leave type.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveTypeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {leaveTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} days`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalLeaveDays)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New Chart: Employee Salary Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Salary Distribution</CardTitle>
            <CardDescription>Number of employees within different salary ranges.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeSalaryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="count" fill="#FFBB28" name="Number of Employees" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* New Chart: Overtime Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Overtime Cost Trend</CardTitle>
            <CardDescription>Monthly trend of total overtime expenses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overtimeCostTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Line type="monotone" dataKey="overtime" stroke="#00C49F" name="Overtime Cost" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* New Chart: Employee Tenure Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Tenure Distribution</CardTitle>
            <CardDescription>Distribution of employees by their length of service.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeeTenureDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {employeeTenureDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalTenureDistribution)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 p-4 border rounded-lg bg-purple-50 text-purple-800">
        <h3 className="font-semibold text-lg mb-2">Analytics Insights</h3>
        <p className="text-sm">
          This section provides a high-level overview of various payroll metrics. For more detailed, filterable, and exportable data, please refer to the "Reports" section. The data presented here is derived from mock data stored in your browser's local storage.
        </p>
      </div>
    </div>
  );
};

export default Analytics;