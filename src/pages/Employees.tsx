"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import EmployeeFormDialog, { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import EmployeesHeader from "@/components/employees/EmployeesHeader";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import EmployeesToolbar, { UNASSIGNED_DEPARTMENT } from "@/components/employees/EmployeesToolbar";
import EmployeesStats from "@/components/employees/EmployeesStats";
import JobTitleDistributionChart from "@/components/employees/JobTitleDistributionChart";
import AverageSalaryChart from "@/components/employees/AverageSalaryChart";
import EmployeesTable from "@/components/employees/EmployeesTable";
import DeleteEmployeeDialog from "@/components/employees/DeleteEmployeeDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useSearchParams } from "react-router-dom";
import { buildEmployeesAdminSummary } from "@/lib/employees-admin-summary";

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<MockEmployee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<MockEmployee | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [payBasisFilter, setPayBasisFilter] = useState<"all" | "salary" | "hourly">("all");
  const [portalAccessFilter, setPortalAccessFilter] = useState<"all" | "true" | "false">("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkHandled = React.useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const jobTitles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.jobTitle && set.add(e.jobTitle));
    return Array.from(set).sort();
  }, [employees]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [employees]);

  const hasUnassignedDepartment = useMemo(
    () => employees.some((e) => !e.department?.trim()),
    [employees]
  );

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
        emp.emergencyContactName,
        emp.startDate,
        emp.salary != null ? `salary ${emp.salary}` : "",
        emp.hourlyRate != null ? `rate ${emp.hourlyRate}` : "",
      ];
      return fields.some((f) => normalize(f).includes(q));
    };

    const matchesFilters = (emp: MockEmployee) => {
      if (jobTitleFilter !== "all" && emp.jobTitle !== jobTitleFilter) return false;

      if (departmentFilter !== "all") {
        if (departmentFilter === UNASSIGNED_DEPARTMENT) {
          if (emp.department?.trim()) return false;
        } else if (emp.department !== departmentFilter) {
          return false;
        }
      }

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

    const base = employees.filter((e) => matchesSearch(e) && matchesFilters(e));
    return sorted(base);
  }, [
    employees,
    debouncedSearch,
    jobTitleFilter,
    departmentFilter,
    payBasisFilter,
    portalAccessFilter,
    sortField,
    sortDir,
  ]);

  const summary = useMemo(
    () => buildEmployeesAdminSummary(filteredEmployees),
    [filteredEmployees]
  );

  const { downloadPdf } = usePdfVector();
  const chartFontSize = useDataVisualsFontSize();

  useEffect(() => {
    if (deepLinkHandled.current) return;

    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      deepLinkHandled.current = true;
      return;
    }

    if (isLoadingEmployees) return;

    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      setEditingEmployee(emp);
      setIsFormOpen(true);
      deepLinkHandled.current = true;
      return;
    }

    deepLinkHandled.current = true;
  }, [employees, isLoadingEmployees, searchParams]);

  const employeeDialogFocus = React.useMemo(() => {
    const focus = (searchParams.get("focus") || "").toLowerCase();
    if (focus === "bank" || focus === "tax" || focus === "personal" || focus === "basic" || focus === "payment") {
      return focus as "bank" | "tax" | "personal" | "basic" | "payment";
    }
    return undefined;
  }, [searchParams]);

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);

    const next = new URLSearchParams(searchParams);
    next.delete("employeeId");
    next.delete("focus");
    setSearchParams(next, { replace: true });
  };

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

  const handleSaveEmployee = async (employeeData: EmployeeFormValues): Promise<boolean> => {
    return addOrUpdateEmployee(employeeData);
  };

  const handleDownloadProfile = async (employee: MockEmployee) => {
    const { default: EmployeeProfilePdfDocument } = await import(
      "@/components/reports/EmployeeProfilePdfDocument"
    );
    const doc = (
      <EmployeeProfilePdfDocument employee={employee} companyDetails={companyDetails || null} />
    );
    const filename = `employee-profile-${employee.firstName}-${employee.lastName}.pdf`;
    await downloadPdf(doc, filename);
  };

  const clearFilters = () => {
    setJobTitleFilter("all");
    setDepartmentFilter("all");
    setPayBasisFilter("all");
    setPortalAccessFilter("all");
    setSearchTerm("");
  };

  return (
    <div className="flex flex-col gap-4">
      <EmployeesHeader onAddEmployee={handleAddEmployeeClick} isMutating={isMutatingEmployee} />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Narrow the directory by role, department, pay type, portal access, or search.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeesToolbar
            jobTitles={jobTitles}
            departments={departments}
            hasUnassignedDepartment={hasUnassignedDepartment}
            jobTitleFilter={jobTitleFilter}
            setJobTitleFilter={setJobTitleFilter}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            payBasisFilter={payBasisFilter}
            setPayBasisFilter={setPayBasisFilter}
            portalAccessFilter={portalAccessFilter}
            setPortalAccessFilter={setPortalAccessFilter}
            sortField={sortField}
            setSortField={setSortField}
            sortDir={sortDir}
            setSortDir={setSortDir}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onRefresh={() => refetchEmployees?.()}
            onClear={clearFilters}
            totalCount={employees.length}
            filteredCount={filteredEmployees.length}
          />
        </CardContent>
      </Card>

      {isLoadingEmployees && employees.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading employees" />
        </div>
      ) : (
        <>
          <EmployeesStats summary={summary} />

          <div className="grid gap-4 lg:grid-cols-2">
            <JobTitleDistributionChart data={summary.jobTitleDistribution} fontSize={chartFontSize} />
            <AverageSalaryChart data={summary.averageSalaryByJobTitle} fontSize={chartFontSize} />
          </div>

          <ErrorBoundary fallbackTitle="Employees error">
            <EmployeesTable
              employees={filteredEmployees}
              isMutatingEmployee={isMutatingEmployee}
              onEdit={handleEditEmployeeClick}
              onDownloadProfile={handleDownloadProfile}
              onDelete={handleDeleteEmployeeClick}
            />
          </ErrorBoundary>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Record structure</p>
          <p className="mt-2">
            Use <strong>Basic</strong> for employment and portal access, <strong>Personal</strong> for identity,
            addresses, and emergency contact (name, number, and address), and <strong>Pay & Bank</strong> for
            compensation and tax details. Enable portal access here, then link a login under{" "}
            <strong>Settings → User Control</strong>. KPI cards and charts reflect the filtered list above.
          </p>
        </CardContent>
      </Card>

      <EmployeeFormDialog
        isOpen={isFormOpen}
        onClose={handleDialogClose}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
        initialFocus={employeeDialogFocus}
        isSaving={isMutatingEmployee}
        allEmployees={employees}
        companyName={
          companyDetails?.companyLegalName ||
          companyDetails?.companyTradingName ||
          "Company"
        }
      />

      <DeleteEmployeeDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        employee={employeeToDelete}
        onConfirm={confirmDeleteEmployee}
        isMutatingEmployee={isMutatingEmployee}
      />
    </div>
  );
};

export default Employees;
