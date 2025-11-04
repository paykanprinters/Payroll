"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { parse, isAfter, isBefore } from "date-fns";
import { TimesheetEntry } from "@/lib/mock-data-interfaces";
import { TimesheetFormValues } from "@/lib/timesheet-types";

const dailyTimesheetSchema = z
  .object({
    timeIn: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
      .optional()
      .or(z.literal("")),
    teaStart: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
      .optional()
      .or(z.literal("")),
    teaEnd: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
      .optional()
      .or(z.literal("")),
    lunchStart: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
      .optional()
      .or(z.literal("")),
    lunchEnd: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
      .optional()
      .or(z.literal("")),
    timeOut: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // If either timeIn or timeOut is provided, both are required and must be in order
    if (data.timeIn || data.timeOut) {
      if (!data.timeIn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Time In is required if Time Out is provided.",
          path: ["timeIn"],
        });
      }
      if (!data.timeOut) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Time Out is required if Time In is provided.",
          path: ["timeOut"],
        });
      }
      if (data.timeIn && data.timeOut) {
        const timeInDate = parse(data.timeIn, "HH:mm", new Date());
        const timeOutDate = parse(data.timeOut, "HH:mm", new Date());
        if (isAfter(timeInDate, timeOutDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Time Out cannot be before Time In.",
            path: ["timeOut"],
          });
        }
      }
    }

    // Tea
    if (data.teaStart || data.teaEnd) {
      if (!data.teaStart || !data.teaEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Both Tea Start and End times are required if one is provided.",
          path: ["teaStart"],
        });
      } else {
        const teaStartDate = parse(data.teaStart, "HH:mm", new Date());
        const teaEndDate = parse(data.teaEnd, "HH:mm", new Date());
        if (isAfter(teaStartDate, teaEndDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Tea End cannot be before Tea Start.",
            path: ["teaEnd"],
          });
        }
        if (data.timeIn && data.timeOut) {
          const timeInDate = parse(data.timeIn, "HH:mm", new Date());
          const timeOutDate = parse(data.timeOut, "HH:mm", new Date());
          if (isBefore(teaStartDate, timeInDate) || isAfter(teaEndDate, timeOutDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Tea break must be within work hours.",
              path: ["teaStart"],
            });
          }
        }
      }
    }

    // Lunch
    if (data.lunchStart || data.lunchEnd) {
      if (!data.lunchStart || !data.lunchEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Both Lunch Start and End times are required if one is provided.",
          path: ["lunchStart"],
        });
      } else {
        const lunchStartDate = parse(data.lunchStart, "HH:mm", new Date());
        const lunchEndDate = parse(data.lunchEnd, "HH:mm", new Date());
        if (isAfter(lunchStartDate, lunchEndDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Lunch End cannot be before Lunch Start.",
            path: ["lunchEnd"],
          });
        }
        if (data.timeIn && data.timeOut) {
          const timeInDate = parse(data.timeIn, "HH:mm", new Date());
          const timeOutDate = parse(data.timeOut, "HH:mm", new Date());
          if (isBefore(lunchStartDate, timeInDate) || isAfter(lunchEndDate, timeOutDate)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Lunch break must be within work hours.",
              path: ["lunchStart"],
            });
          }
        }
      }
    }
  });

type DailyTimesheetFormValues = z.infer<typeof dailyTimesheetSchema>;

interface DayTimesheetFormProps {
  dayDate: string; // yyyy-MM-dd
  employeeId: string;
  existingEntry?: TimesheetEntry | null;
  isLeaveDay: boolean;
  onSave: (values: TimesheetFormValues) => void;
}

const DayTimesheetForm: React.FC<DayTimesheetFormProps> = ({
  dayDate,
  employeeId,
  existingEntry,
  isLeaveDay,
  onSave,
}) => {
  const form = useForm<DailyTimesheetFormValues>({
    resolver: zodResolver(dailyTimesheetSchema),
    defaultValues: {
      timeIn: existingEntry?.timeIn || "",
      teaStart: existingEntry?.teaStart || "",
      teaEnd: existingEntry?.teaEnd || "",
      lunchStart: existingEntry?.lunchStart || "",
      lunchEnd: existingEntry?.lunchEnd || "",
      timeOut: existingEntry?.timeOut || "",
    },
    mode: "onChange",
  });

  // Keep defaults in sync if an existing entry appears later (e.g., after fetch)
  useEffect(() => {
    form.reset({
      timeIn: existingEntry?.timeIn || "",
      teaStart: existingEntry?.teaStart || "",
      teaEnd: existingEntry?.teaEnd || "",
      lunchStart: existingEntry?.lunchStart || "",
      lunchEnd: existingEntry?.lunchEnd || "",
      timeOut: existingEntry?.timeOut || "",
    });
  }, [existingEntry, form]);

  const errors = form.formState.errors;

  const handleSubmit = async (data: DailyTimesheetFormValues) => {
    const payload: TimesheetFormValues = {
      employeeId,
      date: parse(dayDate, "yyyy-MM-dd", new Date()),
      timeIn: data.timeIn || "",
      teaStart: data.teaStart || "",
      teaEnd: data.teaEnd || "",
      lunchStart: data.lunchStart || "",
      lunchEnd: data.lunchEnd || "",
      timeOut: data.timeOut || "",
    };
    onSave(payload);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`timeIn-${dayDate}`}>Time In</Label>
          <Input
            id={`timeIn-${dayDate}`}
            type="time"
            step="60"
            min="00:00"
            max="23:59"
            {...form.register("timeIn")}
            className="mt-1"
            disabled={isLeaveDay}
          />
          {errors.timeIn && <p className="text-red-500 text-sm mt-1">{errors.timeIn.message}</p>}
        </div>
        <div>
          <Label htmlFor={`timeOut-${dayDate}`}>Time Out</Label>
          <Input
            id={`timeOut-${dayDate}`}
            type="time"
            step="60"
            min="00:00"
            max="23:59"
            {...form.register("timeOut")}
            className="mt-1"
            disabled={isLeaveDay}
          />
          {errors.timeOut && <p className="text-red-500 text-sm mt-1">{errors.timeOut.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`teaStart-${dayDate}`}>Tea Time Start (Optional)</Label>
          <Input
            id={`teaStart-${dayDate}`}
            type="time"
            step="60"
            min="00:00"
            max="23:59"
            {...form.register("teaStart")}
            className="mt-1"
            disabled={isLeaveDay}
          />
          {errors.teaStart && <p className="text-red-500 text-sm mt-1">{errors.teaStart.message}</p>}
        </div>
        <div>
          <Label htmlFor={`teaEnd-${dayDate}`}>Tea Time End (Optional)</Label>
          <Input
            id={`teaEnd-${dayDate}`}
            type="time"
            step="60"
            min="00:00"
            max="23:59"
            {...form.register("teaEnd")}
            className="mt-1"
            disabled={isLeaveDay}
          />
          {errors.teaEnd && <p className="text-red-500 text-sm mt-1">{errors.teaEnd.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`lunchStart-${dayDate}`}>Lunch Time Start (Optional)</Label>
          <Input
            id={`lunchStart-${dayDate}`}
            type="time"
            step="60"
            min="00:00"
            max="23:59"
            {...form.register("lunchStart")}
            className="mt-1"
            disabled={isLeaveDay}
          />
          {errors.lunchStart && <p className="text-red-500 text-sm mt-1">{errors.lunchStart.message}</p>}
        </div>
        <div>
          <Label htmlFor={`lunchEnd-${dayDate}`}>Lunch Time End (Optional)</Label>
          <Input
            id={`lunchEnd-${dayDate}`}
            type="time"
            step="60"
            min="00:00"
            max="23:59"
            {...form.register("lunchEnd")}
            className="mt-1"
            disabled={isLeaveDay}
          />
          {errors.lunchEnd && <p className="text-red-500 text-sm mt-1">{errors.lunchEnd.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLeaveDay}>
        Save Day
      </Button>
    </form>
  );
};

export default DayTimesheetForm;