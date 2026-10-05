"use client";

import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { showError, showSuccess } from "@/utils/toast";
import { createPayrollRun, fetchPayrollRuns } from "@/integrations/supabase/payroll-run-queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, CheckCircle2, FileClock, Lock } from "lucide-react";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import WeeklyTimesheetEditorDialog from "@/components/timesheet/WeeklyTimesheetEditorDialog";
import TimesheetEntryDialog from "@/components/timesheet/TimesheetEntryDialog";
import TimesheetFiltersBar from "@/components/timesheet/TimesheetFiltersBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ImportableTimesheetEntry } from "@/lib/timesheet-types";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import TimesheetHeader from "@/components/timesheet/TimesheetHeader";
import { buildTimesheetAdminSummary } from "@/lib/timesheet-admin-summary";

const ImportTimesheetDialog = React.lazy(
  () => import("@/components/timesheet/ImportTimesheetDialog")
);

const Timesheet: React.FC<{ staffEmployeeId?: string; staffView?: boolean }> = ({
  staffEmployeeId,
  staffView = false,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    employees,
    leaveRecords,
    isMockDataEnabled,
    timesheets: initialTimesheets,
    isAuthenticated,
    isLoadingAuth,
    workHoursSettings,
    isLoadingEmployees,
    companyDetails,
    payCycleSettings,
  } = usePayrollProcessor();

  const {
    timesheets,
    isEditing,
    editingTimesheet,
    getEmployeeName,
    addOrUpdateTimesheet,
    deleteTimesheet,
    updateTimesheetStatus,
    startEditing,
    cancelEditing,
    isLeaveDay,
    addTimesheetBatch,
    isLoadingTimesheets,
  } = useTimesheetData({
    initialTimesheets,
    employees,
    leaveRecords,
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
    workHoursSettings,
  });

  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isWeeklyEditorOpen, setIsWeeklyEditorOpen] = React.useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = React.useState(false);
  const [selectedEmployeeIdForWeeklyEditor, setSelectedEmployeeIdForWeeklyEditor] = React.useState("");
  const [selectedDateForWeeklyEditor, setSelectedDateForWeeklyEditor] = React.useState("");

  const [statusFilter, setStatusFilter] = React.useState<"all" | "Draft" | "Submitted" | "Approved" | "Locked">(
    "all"
  );
  const [employeeFilterId, setEmployeeFilterId] = React.useState<string>(staffEmployeeId || "all");
  const [dateStart, setDateStart] = React.useState("");
  const [dateEnd, setDateEnd] = React.useState("");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (staffEmployeeId) setEmployeeFilterId(staffEmployeeId);
  }, [staffEmployeeId]);

  const didInitFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (didInitFromUrl.current) return;
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status") as "all" | "Draft" | "Submitted" | "Approved" | "Locked" | null;
    const ds = searchParams.get("dateStart") || "";
    const de = searchParams.get("dateEnd") || "";
    const q = searchParams.get("search") || "";
    if (employeeId) setEmployeeFilterId(employeeId);
    if (status && ["all", "Draft", "Submitted", "Approved", "Locked"].includes(status)) setStatusFilter(status);
    if (ds) setDateStart(ds);
    if (de) setDateEnd(de);
    if (q) setSearch(q);
    didInitFromUrl.current = true;
  }, [searchParams]);

  React.useEffect(() => {
    if (!didInitFromUrl.current) return;
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string) => {
      if (value) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete("employeeId", employeeFilterId === "all" ? "" : employeeFilterId);
    setOrDelete("status", statusFilter === "all" ? "" : statusFilter);
    setOrDelete("dateStart", dateStart);
    setOrDelete("dateEnd", dateEnd);
    setOrDelete("search", search.trim());
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [employeeFilterId, statusFilter, dateStart, dateEnd, search, searchParams, setSearchParams]);

  const employeesById = React.useMemo(() => {
    const map = new Map<string, { name: string; customId: string }>();
    (employees || []).forEach((e) => {
      map.set(e.id, {
        name: `${e.firstName} ${e.lastName}`.trim(),
        customId: e.customEmployeeId || "N/A",
      });
    });
    return map;
  }, [employees]);

  const filteredTimesheets = React.useMemo(() => {
    let list = [...timesheets];
    if (statusFilter !== "all") list = list.filter((ts) => ts.status === statusFilter);
    if (employeeFilterId !== "all") list = list.filter((ts) => ts.employeeId === employeeFilterId);
    if (dateStart) list = list.filter((ts) => ts.date >= dateStart);
    if (dateEnd) list = list.filter((ts) => ts.date <= dateEnd);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((ts) => {
        const details = employeesById.get(ts.employeeId);
        const haystack = `${details?.name || ""} ${details?.customId || ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [timesheets, statusFilter, employeeFilterId, dateStart, dateEnd, search, employeesById]);

  const summary = React.useMemo(
    () => buildTimesheetAdminSummary(filteredTimesheets),
    [filteredTimesheets]
  );

  const filterListVersion = React.useMemo(
    () => `${statusFilter}|${employeeFilterId}|${dateStart}|${dateEnd}|${search}`,
    [statusFilter, employeeFilterId, dateStart, dateEnd, search]
  );

  const clearFilters = () => {
    setStatusFilter("all");
    if (!staffView) setEmployeeFilterId("all");
    else if (staffEmployeeId) setEmployeeFilterId(staffEmployeeId);
    setDateStart("");
    setDateEnd("");
    setSearch("");
  };

  const openWeeklyEditor = React.useCallback(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const employeeIdToUse = employeeFilterId !== "all" ? employeeFilterId : employees?.[0]?.id || "";
    if (!employeeIdToUse) return;
    setSelectedEmployeeIdForWeeklyEditor(employeeIdToUse);
    setSelectedDateForWeeklyEditor(todayIso);
    setIsWeeklyEditorOpen(true);
  }, [employeeFilterId, employees]);

  const handleEmployeeClick = (employeeId: string, date: string) => {
    setSelectedEmployeeIdForWeeklyEditor(employeeId);
    setSelectedDateForWeeklyEditor(date);
    setIsWeeklyEditorOpen(true);
  };

  const handleEditEntry = (entry: Parameters<typeof startEditing>[0]) => {
    startEditing(entry);
    setIsEntryDialogOpen(true);
  };

  const handleAddEntry = () => {
    cancelEditing();
    setIsEntryDialogOpen(true);
  };

  const handleImportTimesheets = async (
    importedEntries: ImportableTimesheetEntry[],
    payrollPeriod?: { periodStart: string; periodEnd: string }
  ) => {
    const imported = await addTimesheetBatch(importedEntries);
    if (!imported || !payrollPeriod) return;
    if (isMockDataEnabled) {
      showError("Disable mock data to create live payroll runs.");
      return;
    }

    const sameDay = (left: string, right: string) => left.slice(0, 10) === right.slice(0, 10);
    const runs = await fetchPayrollRuns();
    const existing = runs.find(
      (run) =>
        run.status !== "Cancelled" &&
        sameDay(run.periodStart, payrollPeriod.periodStart) &&
        sameDay(run.periodEnd, payrollPeriod.periodEnd)
    );
    if (existing) {
      showSuccess("Opened the payroll run for this period.");
      navigate(`/payroll/runs/${existing.id}`);
      return;
    }

    const run = await createPayrollRun({
      periodStart: payrollPeriod.periodStart,
      periodEnd: payrollPeriod.periodEnd,
      payCycleType: payCycleSettings?.payCycleType ?? "Weekly",
      notes: null,
    });
    if (run) {
      showSuccess("Payroll run created for the imported period.");
      navigate(`/payroll/runs/${run.id}`);
    }
  };

  const isLoading = isLoadingTimesheets || isLoadingEmployees;

  return (
    <div className="flex flex-col gap-4">
      {!staffView && (
        <TimesheetHeader
          onOpenImport={() => setIsImportDialogOpen(true)}
          onOpenWeeklyEditor={openWeeklyEditor}
          onAddEntry={handleAddEntry}
          importDisabled={!!isLoadingEmployees}
          weeklyDisabled={!employees || employees.length === 0}
          addDisabled={!employees || employees.length === 0}
        />
      )}

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Filter entries by status, employee, date range, or search.</CardDescription>
        </CardHeader>
        <CardContent>
          <TimesheetFiltersBar
            employees={employees || []}
            staffView={staffView}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            employeeFilterId={employeeFilterId}
            onEmployeeFilterChange={setEmployeeFilterId}
            dateStart={dateStart}
            onDateStartChange={setDateStart}
            dateEnd={dateEnd}
            onDateEndChange={setDateEnd}
            search={search}
            onSearchChange={setSearch}
            filteredCount={filteredTimesheets.length}
            totalCount={timesheets.length}
            onClear={clearFilters}
            onRefresh={() => window.dispatchEvent(new Event("appFocusRefresh"))}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading timesheets" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="sky" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-sky-600" />
                  In view
                </CardTitle>
                <CardDescription className="text-xs">Filtered entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="amber" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Draft</CardTitle>
                <CardDescription className="text-xs">Needs submission</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.draft}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="sky" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <FileClock className="h-4 w-4 text-sky-600" />
                  Submitted
                </CardTitle>
                <CardDescription className="text-xs">Awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.submitted}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="emerald" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Approved
                </CardTitle>
                <CardDescription className="text-xs">Ready for payroll</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.approved}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
              <SummaryAccent variant="orange" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-orange-600" />
                  Locked
                </CardTitle>
                <CardDescription className="text-xs">Payroll processed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.locked}</div>
              </CardContent>
            </Card>
          </div>

          <ErrorBoundary fallbackTitle="Timesheets error">
            <TimesheetTable
              timesheets={filteredTimesheets}
              employees={employees || []}
              listVersion={filterListVersion}
              onEdit={handleEditEntry}
              onDelete={(id) => void deleteTimesheet(id)}
              onStatusChange={updateTimesheetStatus}
              onEmployeeClick={handleEmployeeClick}
            />
          </ErrorBoundary>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Workflow</p>
          <p className="mt-2">
            Manual entries save as <strong>Draft</strong>. Imported clock times are checked in the
            import window and save as <strong>Approved</strong>. Use{" "}
            <strong>Import and start payroll run</strong> to open that period, then lock the timesheets
            on the run. Use the import preview{" "}
            <strong>Week grid</strong> layout to review days vertically by employee, or{" "}
            <strong>Day cards</strong> on smaller screens when correcting punch times.
          </p>
        </CardContent>
      </Card>

      {isImportDialogOpen && (
        <React.Suspense fallback={null}>
          <ImportTimesheetDialog
            isOpen
            onClose={() => setIsImportDialogOpen(false)}
            onImport={handleImportTimesheets}
            canStartPayrollRun={!staffView}
            employees={employees || []}
            workHoursSettings={workHoursSettings}
            biometricApiUrl={companyDetails?.biometricApiUrl}
          />
        </React.Suspense>
      )}

      <TimesheetEntryDialog
        open={isEntryDialogOpen}
        onOpenChange={setIsEntryDialogOpen}
        employees={employees || []}
        initialData={editingTimesheet}
        isEditing={isEditing}
        isLeaveDay={isLeaveDay}
        onSave={addOrUpdateTimesheet}
        onCancelEdit={cancelEditing}
      />

      <WeeklyTimesheetEditorDialog
        isOpen={isWeeklyEditorOpen}
        onClose={() => setIsWeeklyEditorOpen(false)}
        employeeId={selectedEmployeeIdForWeeklyEditor}
        initialDateInWeek={selectedDateForWeeklyEditor}
        allTimesheets={timesheets}
        onSaveTimesheet={addOrUpdateTimesheet}
        getEmployeeName={getEmployeeName}
        isLeaveDay={isLeaveDay}
        employees={employees || []}
      />
    </div>
  );
};

export default Timesheet;
