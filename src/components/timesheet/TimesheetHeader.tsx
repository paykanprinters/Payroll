"use client";

import React from "react";
import { UploadCloud, Sparkles, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimesheetHeaderProps {
  onOpenImport: () => void;
  onOpenWeeklyEditor: () => void;
  importDisabled?: boolean;
  weeklyDisabled?: boolean;
}

const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({
  onOpenImport,
  onOpenWeeklyEditor,
  importDisabled = false,
  weeklyDisabled = false,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B253A] p-6 text-white md:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(122,186,72,0.22),transparent_55%)]" />
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#7ABA48]/15 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Timesheets</h1>
            <p className="text-sm text-white/75">Track hours, flags, and approvals—ready for payroll.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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