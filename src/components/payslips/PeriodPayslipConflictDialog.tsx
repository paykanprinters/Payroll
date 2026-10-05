"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface PeriodPayslipConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodLabel: string;
  existingCount: number;
  onReplace: () => void;
  title?: string;
  description?: string;
}

const PeriodPayslipConflictDialog: React.FC<PeriodPayslipConflictDialogProps> = ({
  open,
  onOpenChange,
  periodLabel,
  existingCount,
  onReplace,
  title = "Payslips already exist for this period",
  description,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              `${existingCount} payslip${existingCount === 1 ? "" : "s"} ${existingCount === 1 ? "is" : "are"} already stored for ${periodLabel}. Generating again would add a second set for the same pay period. Stop leaves the current payslips in place. Replace overwrites that period with one set and locks the timesheets.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stop</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onReplace();
            }}
          >
            Replace existing payslips
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PeriodPayslipConflictDialog;
