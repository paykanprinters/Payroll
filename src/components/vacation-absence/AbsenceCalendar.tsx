"use client";

import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryAccent from "@/components/dashboard/SummaryAccent";

interface LeaveEntry {
  id: string;
  employeeId: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Unpaid Leave" | "Family Responsibility Leave" | "Maternity Leave";
  startDate: string;
  endDate: string;
  totalDays: number;
  workingDays: number;
  reason?: string;
  documentUrl?: string;
}

interface AbsenceCalendarProps {
  leaveRecords: LeaveEntry[];
}

const AbsenceCalendar: React.FC<AbsenceCalendarProps> = ({ leaveRecords }) => {
  const leaveRanges = leaveRecords.map(record => ({
    from: new Date(record.startDate),
    to: new Date(record.endDate),
  }));

  const modifiers = {
    leaveDays: leaveRanges,
  };

  const modifiersClassNames = {
    leaveDays: "bg-blue-200 text-blue-900 rounded-md",
  };

  return (
    <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <SummaryAccent variant="emerald" />
      <CardHeader>
        <CardTitle>Absence Calendar</CardTitle>
        <CardDescription>
          Visual overview of recorded employee absences.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="range"
          selected={undefined}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
};

export default AbsenceCalendar;