"use client";

import React from "react";
import { CalendarDays, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <CalendarDays className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Vacation & Absence</h1>
            <p className="text-sm text-white/75">
              Record leave for payroll, review trends, and keep timesheets aligned with absences.
            </p>
          </div>
        </div>

        {onRecordAbsence && (
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
        )}
      </div>
    </div>
  );
};

export default VacationAbsenceHeader;
