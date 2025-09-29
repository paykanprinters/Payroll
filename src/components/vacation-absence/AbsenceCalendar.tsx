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
  const highlightedDates = leaveRecords.map(record => ({
    from: new Date(record.startDate),
    to: new Date(record.endDate),
  }));

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
          mode="range"
          selected={highlightedDates}
          className="rounded-md border"
        />
      </CardContent>
    </Card>
  );
};

export default AbsenceCalendar;