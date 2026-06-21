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
import VacationAbsenceForm from "@/components/vacation-absence/VacationAbsenceForm";

interface LeaveRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: MockEmployee[];
  onAddLeave: (leave: Omit<LeaveEntry, "id">) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultEmployeeId?: string;
}

const LeaveRecordDialog: React.FC<LeaveRecordDialogProps> = ({
  open,
  onOpenChange,
  employees,
  onAddLeave,
  isSubmitting = false,
  defaultEmployeeId,
}) => {
  const [formKey, setFormKey] = React.useState(0);

  useEffect(() => {
    if (!open) {
      setFormKey((k) => k + 1);
    }
  }, [open]);

  const handleAddLeave = async (leave: Omit<LeaveEntry, "id">) => {
    await onAddLeave(leave);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Record absence</DialogTitle>
          <DialogDescription>
            Capture leave for payroll and timesheet integration. Working days are calculated
            automatically from the date range.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          <VacationAbsenceForm
            key={formKey}
            employees={employees}
            defaultEmployeeId={defaultEmployeeId}
            onAddLeave={handleAddLeave}
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
