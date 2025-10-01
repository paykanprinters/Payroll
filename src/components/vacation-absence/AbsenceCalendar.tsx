"use client";

import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    leaveDays: leaveRanges, // Pass array of DateRange objects to modifier
  };

  const modifiersClassNames = {
    leaveDays: "bg-blue-200 text-blue-900 rounded-md", // Default style for the entire range
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absence Calendar</CardTitle>
        <CardDescription>
          Visual overview of recorded employee absences.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="range" // Keep range mode for visual consistency, but no active selection
          selected={undefined} // No active selection for display calendar
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
};

export default AbsenceCalendar;