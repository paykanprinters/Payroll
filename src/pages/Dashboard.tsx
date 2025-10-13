"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, CreditCard, Activity } from "lucide-react";
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
  LineChart,
  Line,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, MockPayslip, LeaveEntry } from "@/lib/mock-data-interfaces";
import UpcomingPayrollCard from "@/components/payroll/UpcomingPayrollCard";
import { Calendar } from "@/components/ui/calendar";
import { Link } from "react-router-dom";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { format } from "date-fns"; // Import format for date formatting

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const Dashboard: React.FC = () => {
  const { employees, payslips, leaveRecords, isMockDataEnabled } = usePayrollProcessor();

  const [companyLegalName, setCompanyLegalName] = useState<string>("");
  const [employeeCount, setEmployeeCount] = useState(0);
  const [upcomingPayrollAmount, setUpcomingPayrollAmount] = useState(0);
  const [recentPayslipCount, setRecentPayslipCount] = useState(0);
  const [employeeJobTitleData, setEmployeeJobTitleData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyPayrollData, setMonthlyPayrollData] = useState<{ name: string; payroll: number }[]>([]);
  const [totalDeductionsBreakdown, setTotalDeductionsBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [averageNetPayTrend, setAverageNetPayTrend] = useState<{ name: string; avgNetPay: number }[]>([]);
  const [employeeSalaryDistribution, setEmployeeSalaryDistribution] = useState<{ range: string; count: number }[]>([]);
  const [leaveDaysTakenTrend, setLeaveDaysTakenTrend] = useState<{ name: string; days: number }[]>([]);
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const dataVisualsFontSize = useDataVisualsFontSize();

  const loadDashboardData = React.useCallback(() => {
    setEmployeeCount(employees.length);

    setRecentPayslipCount(payslips.length);

    const totalSalaries = employees.reduce((sum, emp) => sum + (emp.salary || 0) + (emp.hourlyRate ? emp.hourlyRate * 160 : 0), 0);
    setUpcomingPayrollAmount(totalSalaries);

    const jobTitleMap = new Map<string, number>();
    employees.forEach((emp) => {
      jobTitleMap.set(emp.jobTitle, (jobTitleMap.get(emp.jobTitle) || 0) + 1);
    });
    setEmployeeJobTitleData(
      Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value }))
    );

    // Dynamically calculate monthly payroll data from payslips
    const monthlyGrossPayMap = new Map<string, number>();
    payslips.forEach(p => {
      const monthYear = p.payPeriod.substring(0, 7); // "YYYY-MM"
      monthlyGrossPayMap.set(monthYear, (monthlyGrossPayMap.get(monthYear) || 0) + p.grossEarnings);
    });
    const sortedMonthlyPayrollData = Array.from(monthlyGrossPayMap.entries())
      .map(([monthYear, payroll]) => ({
        name: format(new Date(monthYear), 'MMM yyyy'),
        payroll: payroll,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setMonthlyPayrollData(sortedMonthlyPayrollData);

    const deductionsMap = new Map<string, number>();
    payslips.forEach(p => {
      p.deductionsBreakdown.forEach(deduction => {
        deductionsMap.set(deduction.name, (deductionsMap.get(deduction.name) || 0) + deduction.amount);
      });
    });
    setTotalDeductionsBreakdown(
      Array.from(deductionsMap.entries()).map(([name, value]) => ({ name, value }))
    );

    const monthlyNetPayMap = new Map<string, { totalNetPay: number; employeeCount: number }>();
    payslips.forEach(p => {
      const monthYear = p.payPeriod.substring(0, 7);
      const current = monthlyNetPayMap.get(monthYear) || { totalNetPay: 0, employeeCount: 0 };
      monthlyNetPayMap.set(monthYear, {
        totalNetPay: current.totalNetPay + p.netPay,
        employeeCount: current.employeeCount + 1,
      });
    });
    const sortedAverageNetPay = Array.from(monthlyNetPayMap.entries())
      .map(([monthYear, data]) => ({
        name: new Date(monthYear).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        avgNetPay: data.employeeCount > 0 ? data.totalNetPay / data.employeeCount : 0,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setAverageNetPayTrend(sortedAverageNetPay);

    const salaryRanges = [
      { range: "R0 - R20k", min: 0, max: 20000, count: 0 },
      { range: "R20k - R40k", min: 20001, max: 40000, count: 0 },
      { range: "R40k - R60k", min: 40001, max: 60000, count: 0 },
      { range: "R60k+", min: 60001, max: Infinity, count: 0 },
    ];
    employees.forEach(emp => {
      for (const range of salaryRanges) {
        if ((emp.salary || 0) >= range.min && (emp.salary || 0) <= range.max) {
          range.count++;
          break;
        }
      }
    });
    setEmployeeSalaryDistribution(salaryRanges.map(r => ({ range: r.range, count: r.count })));

    const monthlyLeaveDaysMap = new Map<string, number>();
    leaveRecords.forEach(record => {
      const monthYear = record.startDate.substring(0, 7);
      monthlyLeaveDaysMap.set(monthYear, (monthlyLeaveDaysMap.get(monthYear) || 0) + record.workingDays);
    });
    const sortedLeaveDaysTrend = Array.from(monthlyLeaveDaysMap.entries())
      .map(([monthYear, days]) => ({
        name: new Date(monthYear).toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        days: days,
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    setLeaveDaysTakenTrend(sortedLeaveDaysTrend);
  }, [employees, payslips, leaveRecords]);

  const loadCompanyDetails = () => {
    const legalName = localStorage.getItem('companyLegalName');
    setCompanyLegalName(legalName || "");
  };

  useEffect(() => {
    loadDashboardData();
    loadCompanyDetails();
    window.addEventListener('mockDataUpdated', loadDashboardData);
    window.addEventListener('companyDetailsUpdated', loadCompanyDetails);
    return () => {
      window.removeEventListener('mockDataUpdated', loadDashboardData);
      window.removeEventListener('companyDetailsUpdated', loadCompanyDetails);
    };
  }, [loadDashboardData]);

  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalJobTitles = employeeJobTitleData.reduce((sum, entry) => sum + entry.value, 0);
  const totalDeductions = totalDeductionsBreakdown.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">
        {companyLegalName && <span className="text-muted-foreground mr-2">{companyLegalName}</span>}
        Payroll Dashboard
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeCount}</div>
            <p className="text-xs text-muted-foreground">
              {isMockDataEnabled ? "+20.1% from last month (mock)" : (employeeCount > 0 ? "+20.1% from last month" : "No employees")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R {upcomingPayrollAmount.toLocaleString('en-ZA')}</div>
            <p className="text-xs text-muted-foreground">
              {isMockDataEnabled ? "Due: 25th of the month (mock)" : "Due: 25th of the month"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Payslips</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentPayslipCount}</div>
            <p className="text-xs text-muted-foreground">
              {isMockDataEnabled ? "Generated this month (mock)" : "Generated this month"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Good</div>
            <p className="text-xs text-muted-foreground">
              {isMockDataEnabled ? "All regulations met (mock)" : "All regulations met"}
            </p>
          </CardContent>
        </Card>
      </div>

      <UpcomingPayrollCard />

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Payroll Overview</CardTitle>
            <CardDescription>Total gross payroll amount per month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPayrollData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="payroll" fill="#8884d8" name="Total Payroll" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Date</CardTitle>
            <CardDescription>A quick view of the current date.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              fixedWeeks
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* Removed <TopToDosCard /> */}

        <Card>
          <CardHeader>
            <CardTitle>Employee Distribution by Job Title</CardTitle>
            <CardDescription>Breakdown of employees across different roles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeeJobTitleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {employeeJobTitleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalJobTitles)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Deductions Breakdown</CardTitle>
            <CardDescription>Distribution of total deductions across all payslips.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalDeductionsBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {totalDeductionsBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalDeductions)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Net Pay Trend</CardTitle>
            <CardDescription>Average net pay per employee over recent months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={averageNetPayTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Line type="monotone" dataKey="avgNetPay" stroke="#82ca9d" name="Average Net Pay" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee Salary Distribution</CardTitle>
            <CardDescription>Number of employees within different salary ranges.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeSalaryDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="count" fill="#FFBB28" name="Number of Employees" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Leave Days Taken</CardTitle>
            <CardDescription>Total working days taken as leave per month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveDaysTakenTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis allowDecimals={false} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `${value} days`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="days" fill="#00C49F" name="Working Days Taken" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>


      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center space-x-2">
            <Button asChild className="w-full">
              <Link to="/employees">Add New Employee</Link>
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild className="w-full">
              <Link to="/payslips/overview">Generate Payslips</Link>
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild className="w-full">
              <Link to="/reports">View Reports</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on South African Regulations:</h3>
        <p className="text-sm">
          This dashboard provides the user interface for a payroll system. The complex calculations required to meet full South African regulations for pay and deductions (such as PAYE, UIF, SDL, etc.) are highly specialized and typically handled by a robust backend system. This front-end setup provides the structure for managing and displaying payroll data, but the actual calculation logic would need to be implemented on the server-side.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;