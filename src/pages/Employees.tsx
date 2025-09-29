"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  salary: number;
  startDate: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [jobTitleDistribution, setJobTitleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [averageSalaryByJobTitle, setAverageSalaryByJobTitle] = useState<{ name: string; salary: number }[]>([]);

  const loadEmployees = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    if (storedEmployees) {
      const loadedEmployees: MockEmployee[] = JSON.parse(storedEmployees);
      setEmployees(loadedEmployees);

      // Calculate job title distribution
      const jobTitleMap = new Map<string, number>();
      loadedEmployees.forEach((emp) => {
        jobTitleMap.set(emp.jobTitle, (jobTitleMap.get(emp.jobTitle) || 0) + 1);
      });
      setJobTitleDistribution(
        Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value }))
      );

      // Calculate average salary by job title
      const salarySumByJobTitle = new Map<string, { sum: number; count: number }>();
      loadedEmployees.forEach((emp) => {
        const current = salarySumByJobTitle.get(emp.jobTitle) || { sum: 0, count: 0 };
        salarySumByJobTitle.set(emp.jobTitle, {
          sum: current.sum + emp.salary,
          count: current.count + 1,
        });
      });
      setAverageSalaryByJobTitle(
        Array.from(salarySumByJobTitle.entries()).map(([name, data]) => ({
          name,
          salary: data.sum / data.count,
        }))
      );
    } else {
      setEmployees([]);
      setJobTitleDistribution([]);
      setAverageSalaryByJobTitle([]);
    }
  };

  useEffect(() => {
    loadEmployees();
    window.addEventListener('mockDataUpdated', loadEmployees);
    return () => {
      window.removeEventListener('mockDataUpdated', loadEmployees);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Employees Management</h1>
      <p className="text-lg text-muted-foreground">
        Manage all employee records, personal details, and employment information here.
      </p>
      
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Employee Distribution by Job Title</CardTitle>
            <CardDescription>Visual breakdown of employees across different roles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={jobTitleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {jobTitleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Salary by Job Title</CardTitle>
            <CardDescription>Comparison of average salaries across different job titles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={averageSalaryByJobTitle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} />
                <Legend />
                <Bar dataKey="salary" fill="#82ca9d" name="Average Salary" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                  <TableHead>Start Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.id}</TableCell>
                    <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.jobTitle}</TableCell>
                    <TableCell className="text-right">R {employee.salary.toLocaleString('en-ZA')}</TableCell>
                    <TableCell>{employee.startDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No employee data available. Please enable mock data in settings or add employees.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Employee Data Section</h3>
        <p className="text-sm">
          This section would typically feature a table of employees, options to add/edit/delete employees, and view detailed profiles.
        </p>
      </div>
    </div>
  );
};

export default Employees;