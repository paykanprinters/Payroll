"use client";

import React from "react";
import { CalendarDays, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import KanPageBanner from "@/components/KanPageBanner";

interface VacationAbsenceHeaderProps {
  onRecordAbsence?: () => void;
  isSubmitting?: boolean;
  addDisabled?: boolean;
}

const VacationAbsenceHeader: React.FC<VacationAbsenceHeaderProps> = ({
  onRecordAbsence,
  isSubmitting = false,
  addDisabled = false,
}) => {
  return (
    <KanPageBanner
      icon={CalendarDays}
      title="Vacation & Absence"
      description="Record leave for payroll, review trends, and keep timesheets aligned with absences."
      actions={
        onRecordAbsence ? (
          <Button
            onClick={onRecordAbsence}
            disabled={addDisabled || isSubmitting}
            className="bg-white text-cyan-900 hover:bg-white/90"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Record absence
          </Button>
        ) : undefined
      }
    />
  );
};

export default VacationAbsenceHeader;
