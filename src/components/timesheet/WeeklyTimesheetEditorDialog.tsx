"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, startOfWeek, eachDayOfInterval, parse, addDays } from "date-fns";
import { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues } from "@/lib/timesheet-types"; // Import from new types file
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge"; // Import Badge
import DayTimesheetForm from "./DayTimesheetForm";

interface WeeklyTimesheetEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  initialDateInWeek: string; // A date string from within the target week
  allTimesheets: TimesheetEntry[];
  onSaveTimesheet: (data: TimesheetFormValues) => void;
  getEmployeeName: (employeeId: string) => string;
  isLeaveDay: (employeeId: string, date: Date) => boolean; // This prop is still expected from useTimesheetData
  employees: MockEmployee[]; // Pass all employees to get standardDailyHours
}

const WeeklyTimesheetEditorDialog: React.FC<WeeklyTimesheetEditorDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  initialDateInWeek,
  allTimesheets,
  onSaveTimesheet,
  getEmployeeName,
  isLeaveDay, // Use the prop passed from useTimesheetData
  employees,
}) => {
  const employee = employees.find(emp => emp.id === employeeId);
  const employeeName = getEmployeeName(employeeId);
  const employeeCustomId = employee?.customEmployeeId || "N/A"; // Get custom ID

  const currentWeekStart = useMemo(() => {
    return startOfWeek(parse(initialDateInWeek, "yyyy-MM-dd", new Date()), { weekStartsOn: 1 }); // Week starts on Monday
  }, [initialDateInWeek]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeekStart,
      end: addDays(currentWeekStart, 6), // Corrected: use addDays here
    }).map(date => format(date, "yyyy-MM-dd"));
  }, [currentWeekStart]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] h-full flex flex-col"> {/* Added h-full here */}
        <DialogHeader>
          <DialogTitle>Weekly Timesheet for {employeeName} ({employeeCustomId})</DialogTitle> {/* Display custom ID */}
          <DialogDescription>
            Edit clock times for the week of {format(currentWeekStart, "PPP")}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow h-0 min-h-0 pr-4">
          <div className="space-y-6 py-4">
            {weekDays.map((dayDate) => {
              const day = parse(dayDate, "yyyy-MM-dd", new Date());
              const isCurrentDayLeave = isLeaveDay(employeeId, day);
              
              return (
                <div key={dayDate} className="border rounded-md p-4 space-y-3">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    {format(day, "EEEE, PPP")}
                    {isCurrentDayLeave && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">On Leave</Badge>
                    )}
                  </h3>
                  <Separator />
                  <DayTimesheetForm
                    dayDate={dayDate}
                    employeeId={employeeId}
                    existingEntry={allTimesheets.find(ts => ts.employeeId === employeeId && ts.date === dayDate) || undefined}
                    isLeaveDay={isCurrentDayLeave}
                    onSave={(values: TimesheetFormValues) => {
                      onSaveTimesheet(values);
                      showSuccess(`Timesheet for ${format(parse(dayDate, "yyyy-MM-dd", new Date()), "PPP")} saved successfully!`);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyTimesheetEditorDialog;