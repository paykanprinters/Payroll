"use client";

import React from "react";
import { UploadCloud, Sparkles, CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import KanPageBanner from "@/components/KanPageBanner";

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
    <KanPageBanner
      icon={Sparkles}
      title="Timesheets"
      description="Capture, import, and approve clock times before payroll processing."
      actions={
        <>
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
        </>
      }
    />
  );
};

export default TimesheetHeader;
