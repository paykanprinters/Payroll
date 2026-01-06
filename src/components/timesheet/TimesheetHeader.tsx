"use client";

import React from "react";
import { UploadCloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimesheetHeaderProps {
  onOpenImport: () => void;
  importDisabled?: boolean;
}

const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({ onOpenImport, importDisabled = false }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-r from-sky-300 via-indigo-400 to-fuchsia-500 text-white">
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="rounded-xl bg-white/20 p-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">Timesheet Management</h1>
            <p className="text-white/85 text-sm">
              Track hours and breaks with a fresher, retro-funk perspective
            </p>
          </div>
        </div>

        <div className="self-start md:self-auto">
          <Button
            onClick={onOpenImport}
            variant="outline"
            disabled={importDisabled}
            className="rounded-full bg-white/20 hover:bg-white/30 text-white border-white/40"
          >
            <UploadCloud className="mr-2 h-4 w-4" /> Import Clock Times
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimesheetHeader;