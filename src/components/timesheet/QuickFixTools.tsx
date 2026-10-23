"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Wand2, CalendarClock, Eraser, TimerOff } from "lucide-react";

type Props = {
  onNormalizeDates: () => void;
  onClampTimeIn: () => void;
  onClearMissingBreaks: () => void;
  onClampTimeOut: () => void;
  /** Shown rows that clock out after their scheduled end and would be clamped. */
  clampTimeOutCount: number;
};

const QuickFixTools: React.FC<Props> = ({
  onNormalizeDates,
  onClampTimeIn,
  onClearMissingBreaks,
  onClampTimeOut,
  clampTimeOutCount,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 pb-2">
      <Button type="button" variant="outline" onClick={onNormalizeDates}>
        <Wand2 className="h-4 w-4 mr-2" /> Normalize Dates (YYYY-MM-DD)
      </Button>
      <Button type="button" variant="outline" onClick={onClampTimeIn}>
        <CalendarClock className="h-4 w-4 mr-2" /> Clamp Time In to 07:45
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" disabled={clampTimeOutCount === 0}>
            <TimerOff className="h-4 w-4 mr-2" /> Clamp Time Out to end time ({clampTimeOutCount} shown)
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clamp Time Out for {clampTimeOutCount} row(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the rows currently shown by your filters are changed. Their Time Out is set to the scheduled end
              time (Friday hours on Fridays), so time worked after it is not paid as overtime. Use this only when that
              overtime was not authorised. Leave days are skipped, and the original clock-out is kept in each
              timesheet&apos;s history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClampTimeOut}>Clamp Time Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button type="button" variant="outline" onClick={onClearMissingBreaks}>
        <Eraser className="h-4 w-4 mr-2" /> Clear Missing Breaks
      </Button>
    </div>
  );
};

export default QuickFixTools;
