"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, eachDayOfInterval } from "date-fns";
import { CalendarIcon, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { calculateWorkingDays } from "@/lib/payroll-calculations";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import { ALL_LEAVE_TYPES } from "@/lib/leave-admin-summary";

interface VacationAbsenceFormProps {
  employees: MockEmployee[];
  onAddLeave: (leave: Omit<LeaveEntry, "id">) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultEmployeeId?: string;
}

const leaveSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: z.enum(
    [
      "Annual Leave",
      "Sick Leave",
      "Unpaid Leave",
      "Family Responsibility Leave",
      "Maternity Leave",
    ],
    { message: "Leave type is required" }
  ),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  reason: z.string().optional(),
  document: z.any().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const VacationAbsenceForm: React.FC<VacationAbsenceFormProps> = ({
  employees,
  onAddLeave,
  isSubmitting = false,
  defaultEmployeeId = "",
}) => {
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      employeeId: defaultEmployeeId,
      leaveType: "Annual Leave",
      startDate: undefined,
      endDate: undefined,
      reason: "",
      document: undefined,
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("document", reader.result as string);
        showSuccess("Document attached.");
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: LeaveFormValues) => {
    if (!data.startDate || !data.endDate) {
      showError("Please select both start and end dates.");
      return;
    }

    const totalDays = eachDayOfInterval({ start: data.startDate, end: data.endDate }).length;
    const workingDays = calculateWorkingDays(data.startDate, data.endDate);

    await onAddLeave({
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: format(data.startDate, "yyyy-MM-dd"),
      endDate: format(data.endDate, "yyyy-MM-dd"),
      totalDays,
      workingDays,
      reason: data.reason,
      documentUrl: data.document,
    });
  };

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="employeeId">Employee</Label>
        <Select
          onValueChange={(value) => form.setValue("employeeId", value)}
          value={form.watch("employeeId")}
          disabled={isSubmitting}
        >
          <SelectTrigger id="employeeId">
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
                No employees available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && (
          <p className="text-sm text-red-500">{form.formState.errors.employeeId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="leaveType">Leave type</Label>
        <Select
          onValueChange={(value) => form.setValue("leaveType", value as LeaveEntry["leaveType"])}
          value={form.watch("leaveType")}
          disabled={isSubmitting}
        >
          <SelectTrigger id="leaveType">
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            {ALL_LEAVE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.leaveType && (
          <p className="text-sm text-red-500">{form.formState.errors.leaveType.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && form.setValue("startDate", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.startDate && (
            <p className="text-sm text-red-500">{form.formState.errors.startDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && form.setValue("endDate", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.endDate && (
            <p className="text-sm text-red-500">{form.formState.errors.endDate.message}</p>
          )}
        </div>
      </div>

      {startDate && endDate && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          Calendar days: {eachDayOfInterval({ start: startDate, end: endDate }).length} · Working
          days: {calculateWorkingDays(startDate, endDate)}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason / comments</Label>
        <Input
          id="reason"
          {...form.register("reason")}
          disabled={isSubmitting}
          placeholder="e.g. Annual vacation, medical appointment"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">Supporting document (optional)</Label>
        <Input
          id="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={isSubmitting}
        />
        {form.watch("document") && (
          <p className="flex items-center text-xs text-muted-foreground">
            <UploadCloud className="mr-1 h-3 w-3" /> Document attached
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || employees.length === 0}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Record absence"
        )}
      </Button>
    </form>
  );
};

export default VacationAbsenceForm;
