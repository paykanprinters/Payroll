"use client";

import React from "react";
import { UploadCloud, Sparkles, CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimesheetHeaderProps {
  onOpenImport: () => void;
  onOpenWeeklyEditor: () => void;
  onAddEntry: () => void;
  importDisabled?: boolean;
  weeklyDisabled?: boolean;
  addDisabled?: boolean;
}

const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({
  onOpenImport,
  onOpenWeeklyEditor,
  onAddEntry,
  importDisabled = false,
  weeklyDisabled = false,
  addDisabled = false,
}) => {
  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Timesheets</h1>
            <p className="text-sm text-white/75">
              Capture, import, and approve clock times before payroll processing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onAddEntry}
            disabled={addDisabled}
            className="bg-white text-cyan-900 hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> Add entry
          </Button>
          <Button
            onClick={onOpenWeeklyEditor}
            variant="outline"
            disabled={weeklyDisabled}
            className="border-white/25 bg-white/10 text-white hover:bg-white/15"
          >
            <CalendarRange className="h-4 w-4" /> Weekly editor
          </Button>
          <Button
            onClick={onOpenImport}
            variant="outline"
            disabled={importDisabled}
            className="border-white/25 bg-white/10 text-white hover:bg-white/15"
          >
            <UploadCloud className="h-4 w-4" /> Import clock times
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimesheetHeader;
