"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues } from "@/lib/timesheet-types";
import TimesheetForm from "@/components/timesheet/TimesheetForm";

interface TimesheetEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: MockEmployee[];
  initialData?: TimesheetEntry | null;
  isEditing: boolean;
  isLeaveDay: (employeeId: string, date: Date) => boolean;
  onSave: (data: TimesheetFormValues) => void;
  onCancelEdit: () => void;
}

const TimesheetEntryDialog: React.FC<TimesheetEntryDialogProps> = ({
  open,
  onOpenChange,
  employees,
  initialData,
  isEditing,
  isLeaveDay,
  onSave,
  onCancelEdit,
}) => {
  const handleOpenChange = (next: boolean) => {
    if (!next && isEditing) onCancelEdit();
    onOpenChange(next);
  };

  const handleSave = (data: TimesheetFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="space-y-2 border-b px-6 py-5 text-left">
          <DialogTitle>{isEditing ? "Edit timesheet entry" : "Add timesheet entry"}</DialogTitle>
          <DialogDescription>
            Record clock times for a single day. Metrics and flags are calculated when saved.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <TimesheetForm
            employees={employees}
            onSave={handleSave}
            initialData={initialData}
            isEditing={isEditing}
            isLeaveDay={isLeaveDay}
            onCancelEdit={() => handleOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimesheetEntryDialog;
