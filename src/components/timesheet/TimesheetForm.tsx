"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, isBefore, isAfter, parseISO, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { isLeaveDay as checkIsLeaveDayUtil } from "@/lib/timesheet-utils";
import { TimesheetFormValues } from "@/lib/timesheet-types"; // Import from new types file

// Define the schema for form validation
const timesheetSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.date({ required_error: "Date is required" }),
  timeIn: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").min(1, "Time In is required"),
  teaStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  teaEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  lunchStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  lunchEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  timeOut: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").min(1, "Time Out is required"),
}).superRefine((data, ctx) => {
  const timeInDate = parse(data.timeIn, 'HH:mm', new Date());
  const timeOutDate = parse(data.timeOut, 'HH:mm', new Date());

  if (isAfter(timeInDate, timeOutDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Time Out cannot be before Time In.",
      path: ["timeOut"],
    });
  }

  // Validate tea break times
  if (data.teaStart && data.teaEnd) {
    const teaStartDate = parse(data.teaStart, 'HH:mm', new Date());
    const teaEndDate = parse(data.teaEnd, 'HH:mm', new Date());
    if (isAfter(teaStartDate, teaEndDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tea End cannot be before Tea Start.", path: ["teaEnd"] });
    }
    if (isBefore(teaStartDate, timeInDate) || isAfter(teaEndDate, timeOutDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tea break must be within work hours.", path: ["teaStart"] });
    }
  } else if ((data.teaStart && !data.teaEnd) || (!data.teaStart && data.teaEnd)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Both Tea Start and End times are required if one is provided.", path: ["teaStart"] });
  }

  // Validate lunch break times
  if (data.lunchStart && data.lunchEnd) {
    const lunchStartDate = parse(data.lunchStart, 'HH:mm', new Date());
    const lunchEndDate = parse(data.lunchEnd, 'HH:mm', new Date());
    if (isAfter(lunchStartDate, lunchEndDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Lunch End cannot be before Lunch Start.", path: ["lunchEnd"] });
    }
    if (isBefore(lunchStartDate, timeInDate) || isAfter(lunchEndDate, timeOutDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Lunch break must be within work hours.", path: ["lunchStart"] });
    }
  } else if ((data.lunchStart && !data.lunchEnd) || (!data.lunchStart && data.lunchEnd)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Both Lunch Start and End times are required if one is provided.", path: ["lunchStart"] });
  }
});

// type TimesheetFormValues = z.infer<typeof timesheetSchema>; // This line is now redundant, use imported type

interface TimesheetFormProps {
  employees: MockEmployee[];
  onSave: (data: TimesheetFormValues) => void;
  initialData?: TimesheetEntry | null;
  isEditing: boolean;
  isLeaveDay: (employeeId: string, date: Date) => boolean; // This prop is still expected from useTimesheetData
  onCancelEdit: () => void;
}

const TimesheetForm: React.FC<TimesheetFormProps> = ({
  employees,
  onSave,
  initialData,
  isEditing,
  isLeaveDay, // Use the prop passed from useTimesheetData
  onCancelEdit,
}) => {
  const form = useForm<TimesheetFormValues>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      employeeId: "",
      date: new Date(),
      timeIn: "09:00",
      teaStart: "",
      teaEnd: "",
      lunchStart: "13:00",
      lunchEnd: "14:00",
      timeOut: "17:00",
    },
  });

  useEffect(() => {
    if (initialData) {
      const parsedDate = (() => {
        const raw = initialData.date;
        if (!raw) return new Date();
        if (raw.includes("T")) {
          const d = parseISO(raw);
          return isValid(d) ? d : new Date();
        }
        const d = parse(raw, "yyyy-MM-dd", new Date());
        return isValid(d) ? d : new Date();
      })();

      form.reset({
        employeeId: initialData.employeeId,
        date: parsedDate,
        timeIn: initialData.timeIn,
        teaStart: initialData.teaStart || "",
        teaEnd: initialData.teaEnd || "",
        lunchStart: initialData.lunchStart || "",
        lunchEnd: initialData.lunchEnd || "",
        timeOut: initialData.timeOut,
      });
    } else {
      form.reset({
        employeeId: "",
        date: new Date(),
        timeIn: "09:00",
        teaStart: "",
        teaEnd: "",
        lunchStart: "13:00",
        lunchEnd: "14:00",
        timeOut: "17:00",
      });
    }
  }, [initialData, form]);

  const onSubmit = (data: TimesheetFormValues) => {
    onSave(data);
    form.reset({
      employeeId: "",
      date: new Date(),
      timeIn: "09:00",
      teaStart: "",
      teaEnd: "",
      lunchStart: "13:00",
      lunchEnd: "14:00",
      timeOut: "17:00",
    });
  };

  const employeeId = form.watch("employeeId");
  const date = form.watch("date");
  const isCurrentDayLeave = employeeId && date ? isLeaveDay(employeeId, date) : false;

  const watchedDate = form.watch("date");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="employeeId">Employee</Label>
        <Select
          onValueChange={(value) => form.setValue("employeeId", value)}
          value={form.watch("employeeId")}
          disabled={isEditing}
        >
          <SelectTrigger id="employeeId" className="mt-1">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-employees" disabled>
                No employees available (enable mock data)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !watchedDate || !isValid(watchedDate) ? "text-muted-foreground" : ""
              )}
              disabled={isEditing}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watchedDate && isValid(watchedDate) ? format(watchedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={watchedDate && isValid(watchedDate) ? watchedDate : undefined}
              onSelect={(date) => date && form.setValue("date", date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.date && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>
        )}
      </div>

      {isCurrentDayLeave && (
        <div className="p-3 bg-yellow-100 text-yellow-800 rounded-md flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          <span>This employee has approved leave on this date. Timesheet entry may not be required.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="timeIn">Time In</Label>
          <Input id="timeIn" type="time" {...form.register("timeIn")} className="mt-1" />
          {form.formState.errors.timeIn && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.timeIn.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="timeOut">Time Out</Label>
          <Input id="timeOut" type="time" {...form.register("timeOut")} className="mt-1" />
          {form.formState.errors.timeOut && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.timeOut.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="teaStart">Tea Time Start (Optional)</Label>
          <Input id="teaStart" type="time" {...form.register("teaStart")} className="mt-1" />
          {form.formState.errors.teaStart && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.teaStart.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="teaEnd">Tea Time End (Optional)</Label>
          <Input id="teaEnd" type="time" {...form.register("teaEnd")} className="mt-1" />
          {form.formState.errors.teaEnd && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.teaEnd.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lunchStart">Lunch Time Start (Optional)</Label>
          <Input id="lunchStart" type="time" {...form.register("lunchStart")} className="mt-1" />
          {form.formState.errors.lunchStart && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.lunchStart.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lunchEnd">Lunch Time End (Optional)</Label>
          <Input id="lunchEnd" type="time" {...form.register("lunchEnd")} className="mt-1" />
          {form.formState.errors.lunchEnd && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.lunchEnd.message}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {isEditing && (
          <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-1">
            Cancel Edit
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {isEditing ? "Save Changes" : "Record Time"}
        </Button>
      </div>
    </form>
  );
};

export default TimesheetForm;