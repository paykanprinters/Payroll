"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import EmployeeFormDialog, { EmployeeFormValues } from "@/components/employees/EmployeeFormDialog";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { generateEmployeeProfileReportContent } from "@/lib/report-generators";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import EmployeeProfilePdfDocument from "@/components/reports/EmployeeProfilePdfDocument";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import EmployeesHeader from "@/components/employees/EmployeesHeader";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import EmployeesToolbar from "@/components/employees/EmployeesToolbar";
import EmployeesStats from "@/components/employees/EmployeesStats";
import JobTitleDistributionChart from "@/components/employees/JobTitleDistributionChart";
import AverageSalaryChart from "@/components/employees/AverageSalaryChart";
import EmployeesTable from "@/components/employees/EmployeesTable";
import DeleteEmployeeDialog from "@/components/employees/DeleteEmployeeDialog";
import { useSearchParams } from "react-router-dom";

type SortField = "name" | "jobTitle" | "startDate" | "customEmployeeId";
type SortDir = "asc" | "desc";

const DEFAULT_REPORT_DESIGN_SETTINGS: ReportDesignSettings = {
  defaultReportPaperSize: "A4",
  includeCompanyLogo: true,
  includeCompanyDetails: true,
  reportContentFontSize: 14,
  irp5ContentFontSize: 12,
};

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

  // Filters and sorting state
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

  const { downloadPdf } = usePdfVector();

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

  useEffect(() => {
    if (deepLinkHandled.current) return;

    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      deepLinkHandled.current = true;
      return;
    }

    // Wait for employees to load
    if (isLoadingEmployees) return;

    const emp = employees.find((e) => e.id === employeeId);
    if (emp) {
      setEditingEmployee(emp);
      setIsFormOpen(true);

      // Keep focus param so the dialog can route to the correct section.
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

    // Clear deep link params after using them so refreshing doesn't re-open.
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

  const handleSaveEmployee = async (employeeData: EmployeeFormValues) => {
    await addOrUpdateEmployee(employeeData);
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const handleDownloadProfile = async (employee: MockEmployee) => {
    if (!companyDetails) {
      // Keep existing behavior: allow download without company details (still generates a usable PDF)
    }

    // Prefer vector PDF for crisp output
    const doc = (
      <EmployeeProfilePdfDocument employee={employee} companyDetails={companyDetails || null} />
    );
    const filename = `employee-profile-${employee.firstName}-${employee.lastName}.pdf`;
    await downloadPdf(doc, filename);
  };

  const salaryCount = useMemo(
    () => employees.filter(e => e.salary != null && e.salary > 0).length,
    [employees]
  );
  const hourlyCount = useMemo(
    () => employees.filter(e => e.hourlyRate != null && e.hourlyRate > 0).length,
    [employees]
  );

  // Call this hook once at the top-level to avoid varying hook calls across renders
  const chartFontSize = useDataVisualsFontSize();

  if (isLoadingEmployees && employees.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading employees...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EmployeesHeader />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <EmployeesToolbar
            jobTitles={jobTitles}
            departments={departments}
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
            totalCount={employees.length}
            filteredCount={filteredEmployees.length}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleAddEmployeeClick} disabled={isMutatingEmployee}>
            {isMutatingEmployee ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Add employee
          </Button>
        </div>
      </div>

      <EmployeesStats totalCount={employees.length} salaryCount={salaryCount} hourlyCount={hourlyCount} />

      <div className="grid gap-4 lg:grid-cols-2">
        <JobTitleDistributionChart data={jobTitleDistribution} fontSize={chartFontSize} />
        <AverageSalaryChart data={averageSalaryByJobTitle} fontSize={chartFontSize} />
      </div>

      <EmployeesTable
        employees={filteredEmployees}
        isMutatingEmployee={isMutatingEmployee}
        onEdit={handleEditEmployeeClick}
        onDownloadProfile={handleDownloadProfile}
        onDelete={handleDeleteEmployeeClick}
      />

      <EmployeeFormDialog
        isOpen={isFormOpen}
        onClose={handleDialogClose}
        onSave={handleSaveEmployee}
        initialEmployee={editingEmployee}
        initialFocus={employeeDialogFocus}
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