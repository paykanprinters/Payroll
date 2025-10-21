"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

// Helper to convert "HH:mm" to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Define the schema for form validation
const workHoursSchema = z.object({
  dailyStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").min(1, "Start time is required"),
  dailyEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").min(1, "End time is required"),
  fridayStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  fridayEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)").optional().or(z.literal('')),
  breakDurationHours: z.preprocess(
    (val) => (val === "" || isNaN(Number(val))) ? undefined : val,
    z.number().min(0, "Break duration cannot be negative").max(8, "Break duration cannot exceed 8 hours").optional()
  ),
  workDays: z.array(z.string()).min(1, "At least one work day must be selected"),
  overtimeThresholdHours: z.preprocess(
    (val) => (val === "" || isNaN(Number(val))) ? undefined : val,
    z.number().min(0, "Overtime threshold cannot be negative").max(168, "Overtime threshold cannot exceed 168 hours").optional()
  ),
}).superRefine((data, ctx) => {
  const startTimeInMinutes = timeToMinutes(data.dailyStartTime);
  const endTimeInMinutes = timeToMinutes(data.dailyEndTime);

  if (endTimeInMinutes <= startTimeInMinutes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Daily End Time must be after Daily Start Time.",
      path: ["dailyEndTime"],
    });
  }

  if (data.fridayStartTime && data.fridayEndTime) {
    const fridayStartTimeInMinutes = timeToMinutes(data.fridayStartTime);
    const fridayEndTimeInMinutes = timeToMinutes(data.fridayEndTime);
    if (fridayEndTimeInMinutes <= fridayStartTimeInMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Friday End Time must be after Friday Start Time.",
        path: ["fridayEndTime"],
      });
    }
  } else if ((data.fridayStartTime && !data.fridayEndTime) || (!data.fridayStartTime && data.fridayEndTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Both Friday Start and End times are required if one is provided.",
      path: ["fridayStartTime"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Both Friday Start and End times are required if one is provided.",
      path: ["fridayEndTime"],
    });
  }
});

type WorkHoursFormValues = z.infer<typeof workHoursSchema>;

const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const WorkHours: React.FC = () => {
  const form = useForm<WorkHoursFormValues>({
    resolver: zodResolver(workHoursSchema),
    defaultValues: {
      dailyStartTime: "09:00",
      dailyEndTime: "17:00",
      fridayStartTime: "",
      fridayEndTime: "",
      breakDurationHours: 1,
      workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      overtimeThresholdHours: 40,
    },
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const storedSettings = localStorage.getItem("workHoursSettings");
    if (storedSettings) {
      const parsedSettings = JSON.parse(storedSettings);
      form.reset({
        ...parsedSettings,
        // Ensure numbers are parsed correctly if stored as strings
        breakDurationHours: parseFloat(parsedSettings.breakDurationHours) || 0,
        overtimeThresholdHours: parseFloat(parsedSettings.overtimeThresholdHours) || 0,
        // Ensure new fields are initialized if not present
        fridayStartTime: parsedSettings.fridayStartTime || "",
        fridayEndTime: parsedSettings.fridayEndTime || "",
      });
    }
  }, [form]);

  const onSubmit = (data: WorkHoursFormValues) => {
    console.log("Work Hours settings submitted:", data);
    localStorage.setItem("workHoursSettings", JSON.stringify(data));
    window.dispatchEvent(new Event('workHoursSettingsUpdated')); // Notify other components
    showSuccess("Work hours settings saved successfully!");
  };

  const selectedWorkDays = form.watch("workDays");
  const dailyStartTime = form.watch("dailyStartTime");
  const dailyEndTime = form.watch("dailyEndTime");
  const fridayStartTime = form.watch("fridayStartTime");
  const fridayEndTime = form.watch("fridayEndTime");
  const breakDurationHours = form.watch("breakDurationHours");

  const isFridaySelected = selectedWorkDays.includes("Friday");

  const weeklyTotalHours = useMemo(() => {
    if (!dailyStartTime || !dailyEndTime || !selectedWorkDays) return 0;

    const defaultDailyWorkMinutes = (timeToMinutes(dailyEndTime) - timeToMinutes(dailyStartTime)) - ((breakDurationHours || 0) * 60);
    const defaultDailyWorkHours = Math.max(0, defaultDailyWorkMinutes / 60);

    let totalHours = 0;
    selectedWorkDays.forEach(day => {
      if (day === "Friday" && isFridaySelected && fridayStartTime && fridayEndTime) {
        const fridayWorkMinutes = (timeToMinutes(fridayEndTime) - timeToMinutes(fridayStartTime)) - ((breakDurationHours || 0) * 60);
        totalHours += Math.max(0, fridayWorkMinutes / 60);
      } else {
        totalHours += defaultDailyWorkHours;
      }
    });
    
    return totalHours;
  }, [dailyStartTime, dailyEndTime, fridayStartTime, fridayEndTime, breakDurationHours, selectedWorkDays, isFridaySelected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regular Work Hours</CardTitle>
        <CardDescription>
          Define standard working hours and days for your employees. These settings will be used for timesheet validation and payroll calculations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Daily Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Daily Schedule (Monday - Thursday, Saturday - Sunday)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dailyStartTime">Daily Start Time</Label>
                <Input
                  id="dailyStartTime"
                  type="time"
                  {...form.register("dailyStartTime")}
                  className="mt-1"
                />
                {form.formState.errors.dailyStartTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.dailyStartTime.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="dailyEndTime">Daily End Time</Label>
                <Input
                  id="dailyEndTime"
                  type="time"
                  {...form.register("dailyEndTime")}
                  className="mt-1"
                />
                {form.formState.errors.dailyEndTime && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.dailyEndTime.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="breakDurationHours">Break Duration (Hours)</Label>
              <Input
                id="breakDurationHours"
                type="number"
                step="0.5"
                {...form.register("breakDurationHours", { valueAsNumber: true })}
                className="mt-1"
              />
              {form.formState.errors.breakDurationHours && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.breakDurationHours.message}</p>
              )}
            </div>
          </div>

          {/* Friday Specific Hours */}
          {isFridaySelected && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Friday Schedule (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Specify different start/end times for Fridays. If left blank, the daily schedule above will apply.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fridayStartTime">Friday Start Time</Label>
                  <Input
                    id="fridayStartTime"
                    type="time"
                    {...form.register("fridayStartTime")}
                    className="mt-1"
                  />
                  {form.formState.errors.fridayStartTime && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.fridayStartTime.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fridayEndTime">Friday End Time</Label>
                  <Input
                    id="fridayEndTime"
                    type="time"
                    {...form.register("fridayEndTime")}
                    className="mt-1"
                  />
                  {form.formState.errors.fridayEndTime && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.fridayEndTime.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Work Days */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Work Days</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allDays.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={selectedWorkDays.includes(day)}
                    onCheckedChange={(checked) => {
                      const newDays = checked
                        ? [...selectedWorkDays, day]
                        : selectedWorkDays.filter((d) => d !== day);
                      form.setValue("workDays", newDays, { shouldValidate: true });
                    }}
                  />
                  <Label htmlFor={`day-${day}`}>{day}</Label>
                </div>
              ))}
            </div>
            {form.formState.errors.workDays && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.workDays.message}</p>
            )}
          </div>

          {/* Weekly Summary & Overtime */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Weekly Summary & Overtime</h3>
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <Label>Calculated Weekly Total Hours</Label>
              <span className="font-bold text-lg">{weeklyTotalHours.toFixed(2)} hours</span>
            </div>
            <div>
              <Label htmlFor="overtimeThresholdHours">Overtime Threshold (Weekly Hours)</Label>
              <Input
                id="overtimeThresholdHours"
                type="number"
                step="1"
                {...form.register("overtimeThresholdHours", { valueAsNumber: true })}
                className="mt-1"
              />
              {form.formState.errors.overtimeThresholdHours && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.overtimeThresholdHours.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Hours worked above this threshold in a week will be considered overtime.
              </p>
            </div>
          </div>

          <Button type="submit">Save Work Hours Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default WorkHours;