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
import { format, eachDayOfInterval, parse, addDays } from "date-fns";
import { calculatePayPeriodDetails } from "@/lib/payroll-calculations";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
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

  const { payCycleSettings } = usePayrollProcessor({ silent: true });
  const currentWeeklyPeriod = useMemo(() => {
    const refDate = parse(initialDateInWeek, "yyyy-MM-dd", new Date());
    const settings = payCycleSettings ? {
      payCycleType: payCycleSettings.payCycleType,
      cutOffDay: payCycleSettings.cutOffDay,
      payDayOffset: payCycleSettings.payDayOffset,
    } : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };
    return calculatePayPeriodDetails(refDate, "Weekly", settings.cutOffDay, settings.payDayOffset);
  }, [initialDateInWeek, payCycleSettings]);

  const weekDays = useMemo(() => {
    const start = currentWeeklyPeriod.payPeriodStart;
    return eachDayOfInterval({
      start,
      end: addDays(start, 6),
    }).map(date => format(date, "yyyy-MM-dd"));
  }, [currentWeeklyPeriod]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] h-full flex flex-col"> {/* Added h-full here */}
        <DialogHeader>
          <DialogTitle>Weekly Timesheet for {employeeName} ({employeeCustomId})</DialogTitle> {/* Display custom ID */}
          <DialogDescription>
            Edit clock times for the week of {format(currentWeeklyPeriod.payPeriodStart, "PPP")} – {format(currentWeeklyPeriod.payPeriodEnd, "PPP")} (cut-off: Tuesday).
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