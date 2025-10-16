"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimesheetData } from "@/hooks/use-timesheet-data";
import TimesheetForm from "@/components/timesheet/TimesheetForm";
import TimesheetTable from "@/components/timesheet/TimesheetTable";
import { Button } from "@/components/ui/button"; // Import Button
import { UploadCloud } from "lucide-react"; // Import UploadCloud icon
import ImportTimesheetDialog from "@/components/timesheet/ImportTimesheetDialog"; // Import new dialog
import { ImportableTimesheetEntry, TimesheetFormValues } from "@/hooks/use-timesheet-data"; // Import the new type and TimesheetFormValues
import { usePayrollProcessor } from "@/hooks/use-payroll-processor"; // Import usePayrollProcessor

const Timesheet: React.FC = () => {
  const { employees, leaveRecords, isMockDataEnabled, timesheets: initialTimesheets } = usePayrollProcessor(); // Get employees, leaveRecords, isMockDataEnabled, and initialTimesheets from usePayrollProcessor

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
    addTimesheetBatch, // Get the new batch function
  } = useTimesheetData(initialTimesheets, employees, leaveRecords, isMockDataEnabled); // Pass initialTimesheets, employees, leaveRecords, and isMockDataEnabled to useTimesheetData

  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);

  // The handleImportTimesheets function will now just directly call addTimesheetBatch
  const handleImportTimesheets = (importedEntries: ImportableTimesheetEntry[]) => { // Use the new type
    addTimesheetBatch(importedEntries);
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
        {/* Existing Add/Edit button can go here if needed, or remain in the form card */}
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
        getEmployeeName={getEmployeeName}
        onEdit={startEditing}
        onDelete={deleteTimesheet}
        onStatusChange={updateTimesheetStatus}
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
        onImport={handleImportTimesheets} // Pass the updated handler
        employees={employees}
      />
    </div>
  );
};

export default Timesheet;