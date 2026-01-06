"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetForm from "@/components/timesheet/TimesheetForm";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import { Button } from "@/components/ui/button";
import { UploadCloud, Clock, Send, CheckCircle } from "lucide-react";
import ImportTimesheetDialog from "@/components/timesheet/ImportTimesheetDialog";
import WeeklyTimesheetEditorDialog from "@/components/timesheet/WeeklyTimesheetEditorDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ImportableTimesheetEntry } from "@/lib/timesheet-types";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import TimesheetHeader from "@/components/timesheet/TimesheetHeader";

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

  const handleImportTimesheets = (importedEntries: ImportableTimesheetEntry[]) => {
    addTimesheetBatch(importedEntries);
  };

  const handleEmployeeClick = (employeeId: string, date: string) => {
    setSelectedEmployeeIdForWeeklyEditor(employeeId);
    setSelectedDateForWeeklyEditor(date);
    setIsWeeklyEditorOpen(true);
  };

  const totalEntries = React.useMemo(() => timesheets.length, [timesheets]);
  const submittedCount = React.useMemo(() => timesheets.filter(ts => ts.status === "Submitted").length, [timesheets]);
  const approvedCount = React.useMemo(() => timesheets.filter(ts => ts.status === "Approved").length, [timesheets]);

  return (
    <div className="flex flex-col gap-4">
      <TimesheetHeader onOpenImport={() => setIsImportDialogOpen(true)} importDisabled={!!isLoadingEmployees} />

      {/* Compact stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Timesheet table */}
      <TimesheetTable
        timesheets={timesheets}
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
          <li>Mock Data: All data is currently stored in your browser's local storage. Enable mock data in settings to populate initial entries.</li>
        </ul>
      </div>

      {/* Import dialog modal */}
      {isImportDialogOpen && (
        <ImportTimesheetDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImport={handleImportTimesheets}
          employees={employees || []}
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