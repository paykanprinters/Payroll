"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetForm from "@/components/timesheet/TimesheetForm";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import { Button } from "@/components/ui/button";
import { UploadCloud, CalendarDays } from "lucide-react";
import ImportTimesheetDialog from "@/components/timesheet/ImportTimesheetDialog";
import WeeklyTimesheetEditorDialog from "@/components/timesheet/WeeklyTimesheetEditorDialog";
import { ImportableTimesheetEntry, TimesheetFormValues } from "@/lib/timesheet-types"; // Import from lib/timesheet-types
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

const Timesheet: React.FC = () => {
  const { employees, leaveRecords, isMockDataEnabled, timesheets: initialTimesheets, isAuthenticated, isLoadingAuth } = usePayrollProcessor({ silent: true });

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
  } = useTimesheetData({ initialTimesheets, employees, leaveRecords, isMockDataEnabled, isAuthenticated, isLoadingAuth });

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Timesheet Management</h1>
      <p className="text-lg text-muted-foreground">
        Accurately track employee working hours, breaks, and calculate payroll-related metrics.
      </p>

      <div className="flex justify-end gap-2">
        <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
          <UploadCloud className="mr-2 h-4 w-4" /> Import Clock Times
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Timesheet Entry" : "Record Daily Time"}</CardTitle>
          <CardDescription>
            Enter daily clock-in/out times and breaks for an employee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimesheetForm
            employees={employees}
            onSave={addOrUpdateTimesheet}
            initialData={editingTimesheet}
            isEditing={isEditing}
            isLeaveDay={isLeaveDay}
            onCancelEdit={cancelEditing}
          />
        </CardContent>
      </Card>

      <TimesheetTable
        timesheets={timesheets}
        employees={employees}
        onEdit={startEditing}
        onDelete={deleteTimesheet}
        onStatusChange={updateTimesheetStatus}
        onEmployeeClick={handleEmployeeClick}
      />

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Timesheet Module Notes:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>**Automated Calculations**: Total work hours, overtime, late/early flags, and absenteeism are calculated dynamically based on entered times.</li>
          <li>**Approval Workflow**: Timesheets can transition through Draft, Submitted, Approved, and Locked states. Only Draft and Submitted entries are editable.</li>
          <li>**Integration Points**: In a full system, this module would feed data directly into the payroll engine for accurate salary and overtime calculations. It would also check against the leave module for approved absences.</li>
          <li>**Mock Data**: All data is currently stored in your browser's local storage. Enable mock data in settings to populate initial entries.</li>
        </ul>
      </div>

      <ImportTimesheetDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImport={handleImportTimesheets}
        employees={employees}
      />

      {isWeeklyEditorOpen && (
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
      )}
    </div>
  );
};

export default Timesheet;