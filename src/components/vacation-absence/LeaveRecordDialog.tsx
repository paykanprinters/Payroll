"use client";

import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import VacationAbsenceForm, { type LeaveFormMode } from "@/components/vacation-absence/VacationAbsenceForm";

interface LeaveRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: MockEmployee[];
  mode?: LeaveFormMode;
  editingRecord?: LeaveEntry;
  onSubmit: (leave: Omit<LeaveEntry, "id"> | LeaveEntry) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultEmployeeId?: string;
  employeeId?: string;
}

const LeaveRecordDialog: React.FC<LeaveRecordDialogProps> = ({
  open,
  onOpenChange,
  employees,
  mode = "admin-create",
  editingRecord,
  onSubmit,
  isSubmitting = false,
  defaultEmployeeId,
  employeeId,
}) => {
  const [formKey, setFormKey] = React.useState(0);

  useEffect(() => {
    if (!open) {
      setFormKey((k) => k + 1);
    }
  }, [open]);

  const handleSubmit = async (leave: Omit<LeaveEntry, "id"> | LeaveEntry) => {
    await onSubmit(leave);
    onOpenChange(false);
  };

  const title =
    mode === "admin-edit"
      ? "Edit leave record"
      : mode === "staff-submit"
        ? "Request leave"
        : "Record absence";

  const description =
    mode === "staff-submit"
      ? "Submit annual or sick leave for payroll approval. You cannot edit after submission."
      : mode === "admin-edit"
        ? "Update dates, type, status, or supporting document."
        : "Capture leave for payroll and timesheet integration. Working days are calculated automatically.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          <VacationAbsenceForm
            key={`${formKey}-${editingRecord?.id || "new"}`}
            mode={mode}
            employees={employees}
            employeeId={employeeId}
            editingRecord={editingRecord}
            defaultEmployeeId={defaultEmployeeId}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>

        <DialogFooter className="border-t px-6 py-4 sm:justify-start">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRecordDialog;
