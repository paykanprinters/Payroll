"use client";

import React from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetForm from "@/components/timesheet/TimesheetForm";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import { Button } from "@/components/ui/button";
import { Clock, Filter, RefreshCcw, CalendarDays, X } from "lucide-react";
import ImportTimesheetDialog from "@/components/timesheet/ImportTimesheetDialog";
import WeeklyTimesheetEditorDialog from "@/components/timesheet/WeeklyTimesheetEditorDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ImportableTimesheetEntry } from "@/lib/timesheet-types";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import TimesheetHeader from "@/components/timesheet/TimesheetHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Timesheet: React.FC = () => {
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
  } = usePayrollProcessor({ silent: true });

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
  const [selectedEmployeeIdForWeeklyEditor, setSelectedEmployeeIdForWeeklyEditor] = React.useState<string>("");
  const [selectedDateForWeeklyEditor, setSelectedDateForWeeklyEditor] = React.useState<string>("");

  // Toolbar filters/search
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Draft" | "Submitted" | "Approved" | "Locked">(
    "all"
  );
  const [employeeFilterId, setEmployeeFilterId] = React.useState<string>("all");
  const [dateStart, setDateStart] = React.useState<string>("");
  const [dateEnd, setDateEnd] = React.useState<string>("");
  const [search, setSearch] = React.useState<string>("");

  // URL -> state (deep links from readiness blockers)
  const didInitFromUrl = React.useRef(false);
  React.useEffect(() => {
    if (didInitFromUrl.current) return;

    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status") as any;
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

  // state -> URL (so filters are shareable)
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

    // Avoid noisy history spam
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilterId, statusFilter, dateStart, dateEnd, search]);

  const handleImportTimesheets = (importedEntries: ImportableTimesheetEntry[]) => {
    addTimesheetBatch(importedEntries);
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

  const totalEntries = React.useMemo(() => timesheets.length, [timesheets]);
  const submittedCount = React.useMemo(() => timesheets.filter((ts) => ts.status === "Submitted").length, [timesheets]);
  const approvedCount = React.useMemo(() => timesheets.filter((ts) => ts.status === "Approved").length, [timesheets]);
  const draftCount = React.useMemo(() => timesheets.filter((ts) => ts.status === "Draft").length, [timesheets]);
  const lockedCount = React.useMemo(() => timesheets.filter((ts) => ts.status === "Locked").length, [timesheets]);

  const filteredTimesheets = React.useMemo(() => {
    let list = [...timesheets];

    if (statusFilter !== "all") {
      list = list.filter((ts) => ts.status === statusFilter);
    }

    if (employeeFilterId !== "all") {
      list = list.filter((ts) => ts.employeeId === employeeFilterId);
    }

    if (dateStart) {
      list = list.filter((ts) => ts.date >= dateStart);
    }
    if (dateEnd) {
      list = list.filter((ts) => ts.date <= dateEnd);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((ts) => {
        const details = employeesById.get(ts.employeeId);
        const haystack = `${details?.name || ""} ${details?.customId || ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    // Newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [timesheets, statusFilter, employeeFilterId, dateStart, dateEnd, search, employeesById]);

  const clearFilters = () => {
    setStatusFilter("all");
    setEmployeeFilterId("all");
    setDateStart("");
    setDateEnd("");
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-4">
      <TimesheetHeader
        onOpenImport={() => setIsImportDialogOpen(true)}
        onOpenWeeklyEditor={openWeeklyEditor}
        importDisabled={!!isLoadingEmployees}
        weeklyDisabled={!employees || employees.length === 0}
      />

      {/* Toolbar: Filters and Refresh */}
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(v: "all" | "Draft" | "Submitted" | "Approved" | "Locked") => setStatusFilter(v)}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={employeeFilterId} onValueChange={(v) => setEmployeeFilterId(v)}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {(employees || []).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Date From</Label>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="flex-1 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Date To</Label>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="flex-1 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or employee number..."
              className="rounded-xl"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new Event("appFocusRefresh"))}
                className="rounded-xl"
                title="Refresh timesheets"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl">
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <span className="text-xs text-muted-foreground">
                Showing {filteredTimesheets.length} of {timesheets.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="sky" />
          <div className="p-6">
            <div className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <Clock className="h-4 w-4" />
              </span>
              Total entries
            </div>
            <div className="mt-2 text-xs text-muted-foreground">All recorded timesheets</div>
            <div className="mt-3 text-2xl font-bold">{totalEntries}</div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="emerald" />
          <div className="p-6">
            <div className="text-sm font-medium">Submitted</div>
            <div className="mt-2 text-xs text-muted-foreground">Waiting for approval</div>
            <div className="mt-3 text-2xl font-bold">{submittedCount}</div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="emerald" />
          <div className="p-6">
            <div className="text-sm font-medium">Approved</div>
            <div className="mt-2 text-xs text-muted-foreground">Ready for payroll</div>
            <div className="mt-3 text-2xl font-bold">{approvedCount}</div>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="amber" />
          <div className="p-6">
            <div className="text-sm font-medium">Draft</div>
            <div className="mt-2 text-xs text-muted-foreground">Needs submission</div>
            <div className="mt-3 text-2xl font-bold">{draftCount}</div>
          </div>
        </Card>
      </div>

      <ErrorBoundary fallbackTitle="Timesheets error">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <TimesheetForm
            employees={employees}
            onSave={addOrUpdateTimesheet}
            initialData={editingTimesheet}
            isEditing={isEditing}
            isLeaveDay={isLeaveDay}
            onCancelEdit={cancelEditing}
          />
          <TimesheetTable
            timesheets={filteredTimesheets}
            employees={employees}
            onEdit={startEditing}
            onDelete={(id) => void deleteTimesheet(id)}
            onStatusChange={updateTimesheetStatus}
            onEmployeeClick={handleEmployeeClick}
          />
        </div>
      </ErrorBoundary>

      <ImportTimesheetDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleImportTimesheets}
        employees={employees}
        workHoursSettings={workHoursSettings}
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
        employees={employees}
      />
    </div>
  );
};

export default Timesheet;