"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetForm from "@/components/timesheet/TimesheetForm";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import { Button } from "@/components/ui/button";
import { UploadCloud, Clock, Send, CheckCircle, Filter, RefreshCcw, CalendarDays } from "lucide-react";
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

  const handleEmployeeClick = (employeeId: string, date: string) => {
    setSelectedEmployeeIdForWeeklyEditor(employeeId);
    setSelectedDateForWeeklyEditor(date);
    setIsWeeklyEditorOpen(true);
  };

  const employeesById = React.useMemo(() => {
    const map = new Map<string, { name: string; customId: string }>();
    (employees || []).forEach(e => {
      map.set(e.id, { name: `${e.firstName} ${e.lastName}`.trim(), customId: e.customEmployeeId || "N/A" });
    });
    return map;
  }, [employees]);

  const totalEntries = React.useMemo(() => timesheets.length, [timesheets]);
  const submittedCount = React.useMemo(() => timesheets.filter(ts => ts.status === "Submitted").length, [timesheets]);
  const approvedCount = React.useMemo(() => timesheets.filter(ts => ts.status === "Approved").length, [timesheets]);
  const draftCount = React.useMemo(() => timesheets.filter(ts => ts.status === "Draft").length, [timesheets]);
  const lockedCount = React.useMemo(() => timesheets.filter(ts => ts.status === "Locked").length, [timesheets]);

  const filteredTimesheets = React.useMemo(() => {
    let list = [...timesheets];

    if (statusFilter !== "all") {
      list = list.filter(ts => ts.status === statusFilter);
    }

    if (employeeFilterId !== "all") {
      list = list.filter(ts => ts.employeeId === employeeFilterId);
    }

    if (dateStart) {
      list = list.filter(ts => ts.date >= dateStart);
    }
    if (dateEnd) {
      list = list.filter(ts => ts.date <= dateEnd);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(ts => {
        const details = employeesById.get(ts.employeeId);
        const haystack = `${details?.name || ""} ${details?.customId || ""}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    // Newest first
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [timesheets, statusFilter, employeeFilterId, dateStart, dateEnd, search, employeesById]);

  return (
    <div className="flex flex-col gap-4">
      <TimesheetHeader onOpenImport={() => setIsImportDialogOpen(true)} importDisabled={!!isLoadingEmployees} />

      {/* Toolbar: Filters and Refresh */}
      <Card className="border rounded-xl">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v: "all" | "Draft" | "Submitted" | "Approved" | "Locked") => setStatusFilter(v)}>
                <SelectTrigger className="w-full">
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
              <Select
                value={employeeFilterId}
                onValueChange={(v) => setEmployeeFilterId(v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {(employees || []).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Date From</Label>
              <div className="flex items-center gap-1 mt-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="flex-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Date To</Label>
              <div className="flex items-center gap-1 mt-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or employee number..."
              className="rounded-full"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("appFocusRefresh"))}
              className="rounded-full"
              title="Refresh timesheets"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              Showing {filteredTimesheets.length} of {timesheets.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Compact stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="sky" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-100 text-sky-600">
                <Clock className="h-4 w-4" />
              </span>
              Total Entries
            </CardTitle>
            <CardDescription className="text-xs">All recorded timesheets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
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

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
          <SummaryAccent variant="rose" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-600">
                <UploadCloud className="h-4 w-4" />
              </span>
              Draft/Locked
            </CardTitle>
            <CardDescription className="text-xs">Work in progress or locked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">Draft: {draftCount}</div>
            <div className="text-lg font-semibold">Locked: {lockedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheet entry form */}
      <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Timesheet Entry" : "Record Daily Time"}</CardTitle>
          <CardDescription>
            Enter daily clock-in/out times and breaks for an employee.
          </CardDescription>
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

      {/* Module notes */}
      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Timesheet Module Notes:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Automated Calculations: Total work hours, overtime, late/early flags, and absenteeism are calculated dynamically based on entered times.</li>
          <li>Approval Workflow: Timesheets can transition through Draft, Submitted, Approved, and Locked states. Only Draft and Submitted entries are editable.</li>
          <li>Integration Points: In a full system, this module would feed data directly into the payroll engine for accurate salary and overtime calculations. It would also check against the leave module for approved absences.</li>
          <li>Mock Data: Data can be stored locally or fetched live; use the Refresh button above to reload when using live mode.</li>
        </ul>
      </div>

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