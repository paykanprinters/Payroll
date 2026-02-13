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
import { TimesheetFormValues } from "@/lib/timesheet-types";
import { showSuccess } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import DayTimesheetForm from "./DayTimesheetForm";
import { CalendarRange } from "lucide-react";

interface WeeklyTimesheetEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  initialDateInWeek: string; // A date string from within the target week
  allTimesheets: TimesheetEntry[];
  onSaveTimesheet: (data: TimesheetFormValues) => void;
  getEmployeeName: (employeeId: string) => string;
  isLeaveDay: (employeeId: string, date: Date) => boolean;
  employees: MockEmployee[];
}

const WeeklyTimesheetEditorDialog: React.FC<WeeklyTimesheetEditorDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  initialDateInWeek,
  allTimesheets,
  onSaveTimesheet,
  getEmployeeName,
  isLeaveDay,
  employees,
}) => {
  const employee = employees.find((emp) => emp.id === employeeId);
  const employeeName = getEmployeeName(employeeId);
  const employeeCustomId = employee?.customEmployeeId || "N/A";

  const { payCycleSettings } = usePayrollProcessor({ silent: true });
  const currentWeeklyPeriod = useMemo(() => {
    const refDate = parse(initialDateInWeek, "yyyy-MM-dd", new Date());
    const settings = payCycleSettings
      ? {
          payCycleType: payCycleSettings.payCycleType,
          cutOffDay: payCycleSettings.cutOffDay,
          payDayOffset: payCycleSettings.payDayOffset,
        }
      : { payCycleType: "Weekly", cutOffDay: 2, payDayOffset: 0 };
    return calculatePayPeriodDetails(refDate, "Weekly", settings.cutOffDay, settings.payDayOffset);
  }, [initialDateInWeek, payCycleSettings]);

  const weekDays = useMemo(() => {
    const start = currentWeeklyPeriod.payPeriodStart;
    return eachDayOfInterval({
      start,
      end: addDays(start, 6),
    }).map((date) => format(date, "yyyy-MM-dd"));
  }, [currentWeeklyPeriod]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[980px] max-h-[90vh] h-full flex flex-col rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Weekly editor — {employeeName}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({employeeCustomId})</span>
              </DialogTitle>
              <DialogDescription>
                Week of {format(currentWeeklyPeriod.payPeriodStart, "PPP")} – {format(currentWeeklyPeriod.payPeriodEnd, "PPP")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-grow h-0 min-h-0 pr-4">
          <div className="space-y-6 py-4">
            {weekDays.map((dayDate) => {
              const day = parse(dayDate, "yyyy-MM-dd", new Date());
              const isCurrentDayLeave = isLeaveDay(employeeId, day);

              return (
                <div key={dayDate} className="rounded-2xl border bg-white p-4 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold">
                      {format(day, "EEEE")}
                      <span className="ml-2 font-normal text-muted-foreground">{format(day, "PPP")}</span>
                    </h3>
                    {isCurrentDayLeave && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        On leave
                      </Badge>
                    )}
                  </div>
                  <Separator />
                  <DayTimesheetForm
                    dayDate={dayDate}
                    employeeId={employeeId}
                    existingEntry={allTimesheets.find((ts) => ts.employeeId === employeeId && ts.date === dayDate) || undefined}
                    isLeaveDay={isCurrentDayLeave}
                    onSave={(values: TimesheetFormValues) => {
                      onSaveTimesheet(values);
                      showSuccess(`Saved ${format(parse(dayDate, "yyyy-MM-dd", new Date()), "PPP")}.`);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyTimesheetEditorDialog;