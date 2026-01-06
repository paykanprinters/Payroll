"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PlusCircle, Edit, Trash2, Download, Loader2, Search, X } from "lucide-react";
import EmployeeFormDialog, { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import { MockEmployee, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { generateEmployeeProfileReportContent } from "@/lib/report-generators";
import html2pdf from 'html2pdf.js';
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import EmployeesHeader from "@/components/employees/EmployeesHeader";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

const Employees: React.FC = () => {
  const { employees, addOrUpdateEmployee, deleteEmployee, companyDetails, isLoadingEmployees, isMutatingEmployee } = usePayrollProcessor();
  const [jobTitleDistribution, setJobTitleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [averageSalaryByJobTitle, setAverageSalaryByJobTitle] = useState<{ name: string; salary: number }[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MockEmployee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<MockEmployee | null>(null);
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredEmployees = React.useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return employees;

    const normalize = (v: unknown) => (v ?? "").toString().toLowerCase();

    return employees.filter((emp) => {
      const fields = [
        emp.customEmployeeId,
        emp.personalId,
        `${emp.firstName} ${emp.lastName}`,
        emp.jobTitle,
        emp.department,
        emp.email,
        emp.phoneNumber,
        emp.startDate,
        emp.salary != null ? `salary ${emp.salary}` : "",
        emp.hourlyRate != null ? `rate ${emp.hourlyRate}` : "",
      ];
      return fields.some((f) => normalize(f).includes(q));
    });
  }, [employees, debouncedSearch]);

  const dataVisualsFontSize = useDataVisualsFontSize();
  const { generatePdf } = usePdfGenerator();

  const loadEmployeeDataAndCharts = React.useCallback(() => {
    if (employees.length > 0) {
      const jobTitleMap = new Map<string, number>();
      employees.forEach((emp) => {
        jobTitleMap.set(emp.jobTitle, (jobTitleMap.get(emp.jobTitle) || 0) + 1);
      });
      setJobTitleDistribution(
        Array.from(jobTitleMap.entries()).map(([name, value]) => ({ name, value }))
      );

      const salarySumByJobTitle = new Map<string, { sum: number; count: number }>();
      employees.forEach((emp) => {
        const current = salarySumByJobTitle.get(emp.jobTitle) || { sum: 0, count: 0 };
        salarySumByJobTitle.set(emp.jobTitle, {
          sum: current.sum + (emp.salary || 0) + (emp.hourlyRate ? emp.hourlyRate * 160 : 0),
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
      setJobTitleDistribution([]);
      setAverageSalaryByJobTitle([]);
    }
  }, [employees]);

  const loadReportSettings = React.useCallback(() => {
    const savedReportDesignSettings = localStorage.getItem("reportDesignSettings");
    if (savedReportDesignSettings) {
      setReportDesignSettings(JSON.parse(savedReportDesignSettings));
    } else {
      localStorage.setItem("reportDesignSettings", JSON.stringify(DEFAULT_REPORT_DESIGN_SETTINGS));
      setReportDesignSettings(DEFAULT_REPORT_DESIGN_SETTINGS);
    }
  }, []);

  useEffect(() => {
    loadEmployeeDataAndCharts();
    loadReportSettings();
    window.addEventListener('employeesUpdated', loadEmployeeDataAndCharts as EventListener);
    window.addEventListener('reportDesignUpdated', loadReportSettings);
    return () => {
      window.removeEventListener('employeesUpdated', loadEmployeeDataAndCharts as EventListener);
      window.removeEventListener('reportDesignUpdated', loadReportSettings);
    };
  }, [loadEmployeeDataAndCharts, loadReportSettings]);

  const handleAddEmployeeClick = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployeeClick = (employee: MockEmployee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployeeClick = (employee: MockEmployee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (employeeToDelete) {
      await deleteEmployee(employeeToDelete.id, `${employeeToDelete.firstName} ${employeeToDelete.lastName}`);
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleSaveEmployee = async (employeeData: EmployeeFormValues) => {
    await addOrUpdateEmployee(employeeData);
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const handleDownloadProfile = async (employee: MockEmployee) => {
    if (!companyDetails || !reportDesignSettings) {
      showError("Company details or report design settings not loaded. Cannot generate profile.");
      return;
    }

    const renderComponent = ({ onReadyForPdf }: { onReadyForPdf?: () => void }) => (
      <ReportContentWrapper
        reportTitle={`Employee Profile: ${employee.firstName} ${employee.lastName}`}
        reportContent={generateEmployeeProfileReportContent(employee, companyDetails, reportDesignSettings)}
        companyDetails={companyDetails}
        reportDesignSettings={reportDesignSettings}
        isPdfGeneration={true}
        onReadyForPdf={onReadyForPdf}
      />
    );

    const options = {
      filename: `employee-profile-${employee.firstName}-${employee.lastName}.pdf`,
      format: reportDesignSettings.defaultReportPaperSize.toLowerCase() as 'a4' | 'letter' | 'a5',
      documentType: 'report' as const,
    };

    await generatePdf(renderComponent, options);
  };

  const renderLegendText = (value: string, entry: any, total: number) => {
    const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
    return `${value} (${percentage}%)`;
  };

  const totalJobTitles = jobTitleDistribution.reduce((sum, entry) => sum + entry.value, 0);

  if (isLoadingEmployees && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading employees...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <EmployeesHeader />

      <div className="flex justify-end">
        <Button onClick={handleAddEmployeeClick} disabled={isMutatingEmployee} className="rounded-full">
          {isMutatingEmployee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add New Employee
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
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
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  labelLine={false}
                  style={{ fontSize: dataVisualsFontSize }}
                >
                  {jobTitleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalJobTitles)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="emerald" />
          <CardHeader>
            <CardTitle>Average Salary by Job Title</CardTitle>
            <CardDescription>Comparison of average salaries across different job titles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={averageSalaryByJobTitle}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: dataVisualsFontSize }} />
                <YAxis tickFormatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} style={{ fontSize: dataVisualsFontSize }} />
                <Tooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
                <Bar dataKey="salary" fill="#82ca9d" name="Average Salary" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="orange" />
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Employee List</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by ID, name, title, department, email..."
                  className="pl-8 rounded-full"
                  aria-label="Search employees"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="px-2 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length > 0 ? (
            filteredEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Personal ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead className="text-right">Salary/Rate</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.customEmployeeId}</TableCell>
                        <TableCell>{employee.personalId || "N/A"}</TableCell>
                        <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                        <TableCell>{employee.jobTitle}</TableCell>
                        <TableCell>{employee.department || "N/A"}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phoneNumber || "N/A"}</TableCell>
                        <TableCell>{employee.startDate}</TableCell>
                        <TableCell className="text-right">
                          {employee.salary ? `R ${employee.salary.toLocaleString('en-ZA')}` :
                           employee.hourlyRate ? `R ${employee.hourlyRate.toLocaleString('en-ZA')} / hr` : "N/A"}
                        </TableCell>
                        <TableCell className="flex justify-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEditEmployeeClick(employee)} disabled={isMutatingEmployee} className="rounded-full">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDownloadProfile(employee)} disabled={isMutatingEmployee} className="rounded-full">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteEmployeeClick(employee)} disabled={isMutatingEmployee} className="rounded-full">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-xs text-muted-foreground mt-3">
                  Showing {filteredEmployees.length} of {employees.length} employees
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No matching employees for “{debouncedSearch}”.
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No employee data available. Please add employees using the button above or {isLoadingEmployees ? "loading..." : "add employees to the database."}
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the employee{" "}
              <span className="font-semibold">{employeeToDelete?.firstName} {employeeToDelete?.lastName}</span>{" "}
              and their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isMutatingEmployee}>
              {isMutatingEmployee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Employee Data Section</h3>
        <p className="text-sm">
          This section allows for full CRUD operations on employee records. In a real application, these actions would interact with a backend database.
        </p>
      </div>
    </div>
  );
};

export default Employees;