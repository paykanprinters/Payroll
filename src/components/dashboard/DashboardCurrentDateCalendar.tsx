"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";

const DashboardCurrentDateCalendar: React.FC = () => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Date</CardTitle>
        <CardDescription>A quick view of the current date.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
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