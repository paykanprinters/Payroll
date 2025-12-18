"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2, CalendarClock, Eraser } from "lucide-react";

type Props = {
  onNormalizeDates: () => void;
  onClampTimeIn: () => void;
  onClearMissingBreaks: () => void;
};

const QuickFixTools: React.FC<Props> = ({ onNormalizeDates, onClampTimeIn, onClearMissingBreaks }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 pb-2">
      <Button type="button" variant="outline" onClick={onNormalizeDates}>
        <Wand2 className="h-4 w-4 mr-2" /> Normalize Dates (YYYY-MM-DD)
      </Button>
      <Button type="button" variant="outline" onClick={onClampTimeIn}>
        <CalendarClock className="h-4 w-4 mr-2" /> Clamp Time In to 07:45
      </Button>
      <Button type="button" variant="outline" onClick={onClearMissingBreaks}>
        <Eraser className="h-4 w-4 mr-2" /> Clear Missing Breaks
      </Button>
    </div>
  );
};

export default QuickFixTools;