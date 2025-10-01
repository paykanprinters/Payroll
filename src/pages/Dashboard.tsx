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
} from "recharts";

interface MockEmployee {
  id: string;
  salary: number;
  jobTitle: string; // Added for visualization
}

interface MockPayslip {
  id: string;
  grossEarnings: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Dashboard: React.FC = () => {
  const [companyLegalName, setCompanyLegalName] = useState<string>("");
  const [employeeCount, setEmployeeCount] = useState(0);
  const [upcomingPayrollAmount, setUpcomingPayrollAmount] = useState(0);
  const [recentPayslipCount, setRecentPayslipCount] = useState(0);
  const [employeeJobTitleData, setEmployeeJobTitleData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyPayrollData, setMonthlyPayrollData] = useState<{ name: string; payroll: number }[]>([]);

  const loadDashboardData = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    const employees: MockEmployee[] = storedEmployees ? JSON.parse(storedEmployees) : [];
    setEmployeeCount(employees.length);

    const storedPayslips = localStorage.getItem("mockPayslips");
    const payslips: MockPayslip[] = storedPayslips ? JSON.parse(storedPayslips) : [];
    setRecentPayslipCount(payslips.length);

    // Calculate upcoming payroll amount (sum of all employee salaries for simplicity)
    const totalSalaries = employees.reduce((sum, emp) => sum + emp.salary, 0);
    setUpcomingPayrollAmount(totalSalaries);

    // Process employee job title data for PieChart
    const jobTitleMap = new Map<string, number>();
    employees.forEach((emp) => {
      jobTitleMap.set(emp.jobTitle, (jobTitleMap.get(emp.jobTitle) || 0) + 1);
    });
    setEmployeeJobTitleData(
      Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value }))
    );

    // Mock monthly payroll data for BarChart
    setMonthlyPayrollData([
      { name: "Jan", payroll: 300000 },
      { name: "Feb", payroll: 320000 },
      { name: "Mar", payroll: 310000 },
      { name: "Apr", payroll: 330000 },
      { name: "May", payroll: 350000 },
      { name: "Jun", payroll: 340000 },
      { name: "Jul", payroll: totalSalaries }, // Current month reflects actual mock data
    ]);
  };

  const loadCompanyDetails = () => {
    const legalName = localStorage.getItem('companyLegalName');
    setCompanyLegalName(legalName || "");
  };

  useEffect(() => {
    loadDashboardData();
    loadCompanyDetails();
    window.addEventListener('mockDataUpdated', loadDashboardData);
    window.addEventListener('companyDetailsUpdated', loadCompanyDetails); // Listen for company detail updates
    return () => {
      window.removeEventListener('mockDataUpdated', loadDashboardData);
      window.removeEventListener('companyDetailsUpdated', loadCompanyDetails);
    };
  }, []);

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
              {employeeCount > 0 ? "+20.1% from last month (mock)" : "No employees (mock)"}
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
              Due: 25th of the month (mock)
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
              Generated this month (mock)
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
              All regulations met (mock)
            </p>
          </CardContent>
        </Card>
      </div>

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
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
                <Legend />
                <Bar dataKey="payroll" fill="#8884d8" name="Total Payroll" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {employeeJobTitleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
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
            <Button className="w-full">Add New Employee</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button className="w-full">Generate Payslips</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button className="w-full">View Reports</Button>
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