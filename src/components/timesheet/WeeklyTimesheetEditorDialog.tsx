"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format, startOfWeek, eachDayOfInterval, isSameDay, parse, isAfter, isBefore, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues } from "@/lib/timesheet-types"; // Import from new types file
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { isLeaveDay as checkIsLeaveDayUtil } from "@/lib/timesheet-utils"; // Import from new utility

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

// Define schema for a single day's timesheet entry within the weekly editor
const dailyTimesheetSchema = z.object({
  timeIn: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  teaStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  teaEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  lunchStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  lunchEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  timeOut: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // Only validate if timeIn or timeOut are provided
  if (data.timeIn || data.timeOut) {
    if (!data.timeIn) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Time In is required if Time Out is provided.", path: ["timeIn"] });
    }
    if (!data.timeOut) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Time Out is required if Time In is provided.", path: ["timeOut"] });
    }

    if (data.timeIn && data.timeOut) {
      const timeInDate = parse(data.timeIn, 'HH:mm', new Date());
      const timeOutDate = parse(data.timeOut, 'HH:mm', new Date());
      if (isAfter(timeInDate, timeOutDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Time Out cannot be before Time In.", path: ["timeOut"] });
      }
    }
  }

  // Validate tea break times
  if (data.teaStart || data.teaEnd) {
    if (!data.teaStart || !data.teaEnd) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Both Tea Start and End times are required if one is provided.", path: ["teaStart"] });
    } else {
      const teaStartDate = parse(data.teaStart, 'HH:mm', new Date());
      const teaEndDate = parse(data.teaEnd, 'HH:mm', new Date());
      if (isAfter(teaStartDate, teaEndDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tea End cannot be before Tea Start.", path: ["teaEnd"] });
      }
      // Check if tea break is within work hours (if work hours are defined)
      if (data.timeIn && data.timeOut) { // Check if timeIn/timeOut are defined before parsing
        const timeInDate = parse(data.timeIn, 'HH:mm', new Date());
        const timeOutDate = parse(data.timeOut, 'HH:mm', new Date());
        if (isBefore(teaStartDate, timeInDate) || isAfter(teaEndDate, timeOutDate)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tea break must be within work hours.", path: ["teaStart"] });
        }
      }
    }
  }

  // Validate lunch break times
  if (data.lunchStart || data.lunchEnd) {
    if (!data.lunchStart || !data.lunchEnd) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Both Lunch Start and End times are required if one is provided.", path: ["lunchStart"] });
    } else {
      const lunchStartDate = parse(data.lunchStart, 'HH:mm', new Date());
      const lunchEndDate = parse(data.lunchEnd, 'HH:mm', new Date());
      if (isAfter(lunchStartDate, lunchEndDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Lunch End cannot be before Lunch Start.", path: ["lunchEnd"] });
      }
      // Check if lunch break is within work hours (if work hours are defined)
      if (data.timeIn && data.timeOut) { // Check if timeIn/timeOut are defined before parsing
        const timeInDate = parse(data.timeIn, 'HH:mm', new Date());
        const timeOutDate = parse(data.timeOut, 'HH:mm', new Date());
        if (isBefore(lunchStartDate, timeInDate) || isAfter(lunchEndDate, timeOutDate)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Lunch break must be within work hours.", path: ["lunchStart"] });
        }
      }
    }
  }
});

type DailyTimesheetFormValues = z.infer<typeof dailyTimesheetSchema>;

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

  // Map of day string to its form instance
  const dailyForms = weekDays.map(day => {
    const existingEntry = allTimesheets.find(ts => ts.employeeId === employeeId && ts.date === day);
    return useForm<DailyTimesheetFormValues>({
      resolver: zodResolver(dailyTimesheetSchema),
      defaultValues: {
        timeIn: existingEntry?.timeIn || "",
        teaStart: existingEntry?.teaStart || "",
        teaEnd: existingEntry?.teaEnd || "",
        lunchStart: existingEntry?.lunchStart || "",
        lunchEnd: existingEntry?.lunchEnd || "",
        timeOut: existingEntry?.timeOut || "",
      },
    });
  });

  // Reset forms when dialog opens or employee/week changes
  useEffect(() => {
    if (isOpen) {
      weekDays.forEach((day, index) => {
        const existingEntry = allTimesheets.find(ts => ts.employeeId === employeeId && ts.date === day);
        dailyForms[index].reset({
          timeIn: existingEntry?.timeIn || "",
          teaStart: existingEntry?.teaStart || "",
          teaEnd: existingEntry?.teaEnd || "",
          lunchStart: existingEntry?.lunchStart || "",
          lunchEnd: existingEntry?.lunchEnd || "",
          timeOut: existingEntry?.timeOut || "",
        });
      });
    }
  }, [isOpen, employeeId, initialDateInWeek, allTimesheets, weekDays, dailyForms]);


  const handleSaveDay = async (dayIndex: number, dayDate: string) => {
    const form = dailyForms[dayIndex];
    const isValid = await form.trigger(); // Manually trigger validation for this day's form

    if (!isValid) {
      showError("Please correct the errors in the timesheet entry for this day.");
      return;
    }

    const data = form.getValues();
    const timesheetData: TimesheetFormValues = {
      employeeId: employeeId,
      date: parse(dayDate, "yyyy-MM-dd", new Date()),
      timeIn: data.timeIn || "",
      teaStart: data.teaStart || "",
      teaEnd: data.teaEnd || "",
      lunchStart: data.lunchStart || "",
      lunchEnd: data.lunchEnd || "",
      timeOut: data.timeOut || "",
    };
    onSaveTimesheet(timesheetData);
    showSuccess(`Timesheet for ${format(parse(dayDate, "yyyy-MM-dd", new Date()), "PPP")} saved successfully!`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Weekly Timesheet for {employeeName} ({employeeCustomId})</DialogTitle> {/* Display custom ID */}
          <DialogDescription>
            Edit clock times for the week of {format(currentWeekStart, "PPP")}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4">
          <div className="space-y-6 py-4">
            {weekDays.map((dayDate, index) => {
              const day = parse(dayDate, "yyyy-MM-dd", new Date());
              const isCurrentDayLeave = isLeaveDay(employeeId, day);
              const form = dailyForms[index];
              const errors = form.formState.errors;

              return (
                <div key={dayDate} className="border rounded-md p-4 space-y-3">
                  <h3 className="font-semibold text-lg flex items-center justify-between">
                    {format(day, "EEEE, PPP")}
                    {isCurrentDayLeave && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">On Leave</Badge>
                    )}
                  </h3>
                  <Separator />
                  <form onSubmit={form.handleSubmit(() => handleSaveDay(index, dayDate))} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`timeIn-${dayDate}`}>Time In</Label>
                        <Input id={`timeIn-${dayDate}`} type="time" {...form.register("timeIn")} className="mt-1" disabled={isCurrentDayLeave} />
                        {errors.timeIn && (<p className="text-red-500 text-sm mt-1">{errors.timeIn.message}</p>)}
                      </div>
                      <div>
                        <Label htmlFor={`timeOut-${dayDate}`}>Time Out</Label>
                        <Input id={`timeOut-${dayDate}`} type="time" {...form.register("timeOut")} className="mt-1" disabled={isCurrentDayLeave} />
                        {errors.timeOut && (<p className="text-red-500 text-sm mt-1">{errors.timeOut.message}</p>)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`teaStart-${dayDate}`}>Tea Time Start (Optional)</Label>
                        <Input id={`teaStart-${dayDate}`} type="time" {...form.register("teaStart")} className="mt-1" disabled={isCurrentDayLeave} />
                        {errors.teaStart && (<p className="text-red-500 text-sm mt-1">{errors.teaStart.message}</p>)}
                      </div>
                      <div>
                        <Label htmlFor={`teaEnd-${dayDate}`}>Tea Time End (Optional)</Label>
                        <Input id={`teaEnd-${dayDate}`} type="time" {...form.register("teaEnd")} className="mt-1" disabled={isCurrentDayLeave} />
                        {errors.teaEnd && (<p className="text-red-500 text-sm mt-1">{errors.teaEnd.message}</p>)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`lunchStart-${dayDate}`}>Lunch Time Start (Optional)</Label>
                        <Input id={`lunchStart-${dayDate}`} type="time" {...form.register("lunchStart")} className="mt-1" disabled={isCurrentDayLeave} />
                        {errors.lunchStart && (<p className="text-red-500 text-sm mt-1">{errors.lunchStart.message}</p>)}
                      </div>
                      <div>
                        <Label htmlFor={`lunchEnd-${dayDate}`}>Lunch Time End (Optional)</Label>
                        <Input id={`lunchEnd-${dayDate}`} type="time" {...form.register("lunchEnd")} className="mt-1" disabled={isCurrentDayLeave} />
                        {errors.lunchEnd && (<p className="text-red-500 text-sm mt-1">{errors.lunchEnd.message}</p>)}
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isCurrentDayLeave}>Save Day</Button>
                  </form>
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