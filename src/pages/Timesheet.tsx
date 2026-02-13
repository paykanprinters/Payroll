"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetForm from "@/components/timesheet/TimesheetForm";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import { Button } from "@/components/ui/button";
import { Clock, Send, CheckCircle, Filter, RefreshCcw, CalendarDays, X } from "lucide-react";
import ImportTimesheetDialog from "@/components/timesheet/ImportTimesheetDialog";
import WeeklyTimesheetEditorDialog from "@/components/timesheet/WeeklyTimesheetEditorDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ImportableTimesheetEntry } from "@/lib/timesheet-types";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import TimesheetHeader from "@/components/timesheet/TimesheetHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Timesheet: React.FC = () => {
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
  const [statusFilter, setStatusFilter] = React.useState<"all" | "Draft" | "Submitted" | "Approved" | "Locked">("all");
  const [employeeFilterId, setEmployeeFilterId] = React.useState<string>("all");
  const [dateStart, setDateStart] = React.useState<string>("");
  const [dateEnd, setDateEnd] = React.useState<string>("");
  const [search, setSearch] = React.useState<string>("");

  const handleImportTimesheets = (importedEntries: ImportableTimesheetEntry[]) => {
    addTimesheetBatch(importedEntries);
  };

  const openWeeklyEditor = React.useCallback(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const employeeIdToUse = employeeFilterId !== "all" ? employeeFilterId : (employees?.[0]?.id || "");
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
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="flex-1 rounded-xl" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Date To</Label>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="flex-1 rounded-xl" />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <Clock className="h-4 w-4" />
              </span>
              Total entries
            </CardTitle>
            <CardDescription className="text-xs">All recorded timesheets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="emerald" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                <Send className="h-4 w-4" />
              </span>
              Submitted
            </CardTitle>
            <CardDescription className="text-xs">Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submittedCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="orange" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
                <CheckCircle className="h-4 w-4" />
              </span>
              Approved
            </CardTitle>
            <CardDescription className="text-xs">Finalized entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
          <SummaryAccent variant="rose" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft / Locked</CardTitle>
            <CardDescription className="text-xs">Work in progress or locked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-semibold">{draftCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Locked</span>
              <span className="font-semibold">{lockedCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheet entry form */}
      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle className="text-xl">{isEditing ? "Edit timesheet entry" : "Record daily time"}</CardTitle>
          <CardDescription>Enter daily clock-in/out times and breaks for an employee.</CardDescription>
        </CardHeader>
        <CardContent>
          <TimesheetForm
            employees={employees || []}
            onSave={addOrUpdateTimesheet}
            initialData={editingTimesheet}
            isEditing={isEditing}
            isLeaveDay={isLeaveDay}
            onCancelEdit={cancelEditing}
          />
        </CardContent>
      </Card>

      {/* Timesheet table (filtered) */}
      <TimesheetTable
        timesheets={filteredTimesheets}
        employees={employees || []}
        onEdit={startEditing}
        onDelete={deleteTimesheet}
        onStatusChange={updateTimesheetStatus}
        onEmployeeClick={handleEmployeeClick}
      />

      {/* Import dialog modal */}
      {isImportDialogOpen && (
        <ImportTimesheetDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImportTimesheets}
          employees={employees || []}
          workHoursSettings={workHoursSettings}
        />
      )}

      {/* Weekly editor modal */}
      {isWeeklyEditorOpen && (
        <ErrorBoundary fallbackTitle="Weekly Timesheet Editor failed to render" onReset={() => setIsWeeklyEditorOpen(false)}>
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
        </ErrorBoundary>
      )}
    </div>
  );
};

export default Timesheet;