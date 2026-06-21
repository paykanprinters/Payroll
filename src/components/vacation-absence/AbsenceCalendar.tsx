"use client";

import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveEntry } from "@/lib/mock-data-interfaces";

interface AbsenceCalendarProps {
  leaveRecords: LeaveEntry[];
  recordCount?: number;
}

const AbsenceCalendar: React.FC<AbsenceCalendarProps> = ({ leaveRecords, recordCount }) => {
  const leaveRanges = leaveRecords.map((record) => ({
    from: new Date(record.startDate),
    to: new Date(record.endDate),
  }));

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Absence calendar</CardTitle>
        <CardDescription>
          Highlighted days reflect {recordCount ?? leaveRecords.length} filtered leave record
          {(recordCount ?? leaveRecords.length) === 1 ? "" : "s"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leaveRecords.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            No absences in the current filter range to display on the calendar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex justify-center min-w-[280px]">
              <Calendar
                mode="range"
                selected={undefined}
                modifiers={{ leaveDays: leaveRanges }}
                modifiersClassNames={{
                  leaveDays: "bg-sky-200 text-sky-950 rounded-md font-medium",
                }}
                className="rounded-md border"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AbsenceCalendar;
