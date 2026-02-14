"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

const DashboardCurrentDateCalendar: React.FC = () => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle>Current Date</CardTitle>
        <CardDescription>A quick view of the current date.</CardDescription>
      </CardHeader>
      <CardContent className="flex h-[320px] items-center justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
          fixedWeeks
        />
      </CardContent>
    </Card>
  );
};

export default DashboardCurrentDateCalendar;