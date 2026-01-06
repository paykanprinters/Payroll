"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PlusCircle, Edit, Trash2, Download, Loader2, Search, X, RefreshCcw, ListFilter, ArrowUpDown } from "lucide-react";
import EmployeeFormDialog, { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
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
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { generateEmployeeProfileReportContent } from "@/lib/report-generators";
import html2pdf from 'html2pdf.js';
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePdfGenerator } from "@/hooks/use-pdf-generator";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import EmployeesHeader from "@/components/employees/EmployeesHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

type SortField = "name" | "jobTitle" | "startDate" | "customEmployeeId";
type SortDir = "asc" | "desc";

const Employees: React.FC = () => {
  const {
    employees,
    addOrUpdateEmployee,
    deleteEmployee,
    companyDetails,
    isLoadingEmployees,
    isMutatingEmployee,
    refetchEmployees,
  } = usePayrollProcessor();

  const [jobTitleDistribution, setJobTitleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [averageSalaryByJobTitle, setAverageSalaryByJobTitle] = useState<{ name: string; salary: number }[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MockEmployee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<MockEmployee | null>(null);
  const [reportDesignSettings, setReportDesignSettings] = useState<ReportDesignSettings>(DEFAULT_REPORT_DESIGN_SETTINGS);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // New filters and sorting
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [payBasisFilter, setPayBasisFilter] = useState<"all" | "salary" | "hourly">("all");
  const [portalAccessFilter, setPortalAccessFilter] = useState<"all" | "true" | "false">("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const jobTitles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => e.jobTitle && set.add(e.jobTitle));
    return Array.from(set).sort();
  }, [employees]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const normalize = (v: unknown) => (v ?? "").toString().toLowerCase();

    const matchesSearch = (emp: MockEmployee) => {
      if (!q) return true;
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
    };

    const matchesFilters = (emp: MockEmployee) => {
      if (jobTitleFilter !== "all" && emp.jobTitle !== jobTitleFilter) return false;
      if (departmentFilter !== "all" && (emp.department || "N/A") !== departmentFilter) return false;

      const hasSalary = emp.salary != null && emp.salary > 0;
      const hasHourly = emp.hourlyRate != null && emp.hourlyRate > 0;
      if (payBasisFilter === "salary" && !hasSalary) return false;
      if (payBasisFilter === "hourly" && !hasHourly) return false;

      if (portalAccessFilter !== "all") {
        const access = emp.portalAccess === true ? "true" : "false";
        if (access !== portalAccessFilter) return false;
      }

      return true;
    };

    const sorted = (list: MockEmployee[]) => {
      const compare = (a: MockEmployee, b: MockEmployee) => {
        let av = "";
        let bv = "";
        if (sortField === "name") {
          av = `${a.firstName} ${a.lastName}`.toLowerCase();
          bv = `${b.firstName} ${b.lastName}`.toLowerCase();
        } else if (sortField === "jobTitle") {
          av = (a.jobTitle || "").toLowerCase();
          bv = (b.jobTitle || "").toLowerCase();
        } else if (sortField === "startDate") {
          av = a.startDate || "";
          bv = b.startDate || "";
        } else if (sortField === "customEmployeeId") {
          av = (a.customEmployeeId || "").toLowerCase();
          bv = (b.customEmployeeId || "").toLowerCase();
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      };
      return [...list].sort(compare);
    };

    const base = employees.filter(e => matchesSearch(e) && matchesFilters(e));
    return sorted(base);
  }, [employees, debouncedSearch, jobTitleFilter, departmentFilter, payBasisFilter, portalAccessFilter, sortField, sortDir]);

  const dataVisualsFontSize = useDataVisualsFontSize();
  const { generatePdf } = usePdfGenerator();

  const loadEmployeeDataAndCharts = useCallback(() => {
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

  const loadReportSettings = useCallback(() => {
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
      // Keep UX simple: rely on toast from hooks elsewhere
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

  const salaryCount = useMemo(
    () => employees.filter(e => e.salary != null && e.salary > 0).length,
    [employees]
  );
  const hourlyCount = useMemo(
    () => employees.filter(e => e.hourlyRate != null && e.hourlyRate > 0).length,
    [employees]
  );

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

      {/* Toolbar: Filters, Sorting, Actions */}
      <Card className="border rounded-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={jobTitleFilter} onValueChange={setJobTitleFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Job title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All job titles</SelectItem>
                  {jobTitles.map((jt) => <SelectItem key={jt} value={jt}>{jt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={payBasisFilter} onValueChange={(v: "all" | "salary" | "hourly") => setPayBasisFilter(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pay basis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={portalAccessFilter} onValueChange={(v: "all" | "true" | "false") => setPortalAccessFilter(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Portal access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortField} onValueChange={(v: SortField) => setSortField(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="jobTitle">Job Title</SelectItem>
                  <SelectItem value="startDate">Start Date</SelectItem>
                  <SelectItem value="customEmployeeId">Employee ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortDir} onValueChange={(v: SortDir) => setSortDir(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchEmployees?.()}
                className="rounded-full"
                title="Refresh employees"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <span className="text-xs text-muted-foreground">
                Showing {filteredEmployees.length} of {employees.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
          <SummaryAccent variant="sky" />
          <CardHeader className="pb-2">
            <CardTitle>Total Employees</CardTitle>
            <CardDescription>Organization size</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
          <SummaryAccent variant="emerald" />
          <CardHeader className="pb-2">
            <CardTitle>Salary-based</CardTitle>
            <CardDescription>Fixed compensation</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{salaryCount}</div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
          <SummaryAccent variant="orange" />
          <CardHeader className="pb-2">
            <CardTitle>Hourly-based</CardTitle>
            <CardDescription>Time-based compensation</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold">{hourlyCount}</div>
          </CardContent>
        </Card>
      </div>

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
                <ReTooltip contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <ReLegend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: dataVisualsFontSize }} formatter={(value, entry) => renderLegendText(value, entry, totalJobTitles)} />
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
                <ReTooltip formatter={(value: number) => `R ${value.toLocaleString('en-ZA')}`} contentStyle={{ fontSize: dataVisualsFontSize }} labelStyle={{ fontSize: dataVisualsFontSize }} />
                <ReLegend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: dataVisualsFontSize }} />
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
                          {employee.salary ? (
                            <div className="inline-flex items-center gap-2">
                              <Badge variant="secondary">Salary</Badge>
                              <span>{`R ${employee.salary.toLocaleString('en-ZA')}`}</span>
                            </div>
                          ) : employee.hourlyRate ? (
                            <div className="inline-flex items-center gap-2">
                              <Badge variant="secondary">Hourly</Badge>
                              <span>{`R ${employee.hourlyRate.toLocaleString('en-ZA')} / hr`}</span>
                            </div>
                          ) : (
                            "N/A"
                          )}
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
          Filter, sort, add, edit, delete, and download employee profiles. Use Refresh to reload from the database when live mode is enabled.
        </p>
      </div>
    </div>
  );
};

export default Employees;