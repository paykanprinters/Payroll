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
import { CalendarIcon, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { calculateWorkingDays } from "@/lib/utils"; // Corrected import path

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
}

interface VacationAbsenceFormProps {
  employees: MockEmployee[];
  onAddLeave: (leave: Omit<LeaveEntry, 'id'>) => void;
}

interface LeaveEntry {
  id: string;
  employeeId: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Unpaid Leave" | "Family Responsibility Leave" | "Maternity Leave";
  startDate: string;
  endDate: string;
  totalDays: number;
  workingDays: number;
  reason?: string;
  documentUrl?: string;
}

const leaveSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: z.enum(["Annual Leave", "Sick Leave", "Unpaid Leave", "Family Responsibility Leave", "Maternity Leave"], { message: "Leave type is required" }),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  reason: z.string().optional(),
  document: z.any().optional(), // For file input (base64 string)
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const VacationAbsenceForm: React.FC<VacationAbsenceFormProps> = ({ employees, onAddLeave }) => {
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      employeeId: "",
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
        showSuccess("Document uploaded successfully!");
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

    const newLeave: Omit<LeaveEntry, 'id'> = {
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: format(data.startDate, "yyyy-MM-dd"),
      endDate: format(data.endDate, "yyyy-MM-dd"),
      totalDays: totalDays,
      workingDays: workingDays,
      reason: data.reason,
      documentUrl: data.document,
    };

    onAddLeave(newLeave);
    showSuccess("Leave record added successfully!");
    form.reset({
      employeeId: "",
      leaveType: "Annual Leave",
      startDate: undefined,
      endDate: undefined,
      reason: "",
      document: undefined,
    });
  };

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="employeeId">Employee</Label>
        <Select
          onValueChange={(value) => form.setValue("employeeId", value)}
          value={form.watch("employeeId")}
        >
          <SelectTrigger id="employeeId" className="mt-1">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.id})
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
        <Label htmlFor="leaveType">Leave Type</Label>
        <Select
          onValueChange={(value) => form.setValue("leaveType", value as LeaveEntry["leaveType"])}
          value={form.watch("leaveType")}
        >
          <SelectTrigger id="leaveType" className="mt-1">
            <SelectValue placeholder="Select leave type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Annual Leave">Annual Leave</SelectItem>
            <SelectItem value="Sick Leave">Sick Leave</SelectItem>
            <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
            <SelectItem value="Family Responsibility Leave">Family Responsibility Leave</SelectItem>
            <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.leaveType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.leaveType.message}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="startDate">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => form.setValue("startDate", date!)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.startDate && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
          )}
        </div>

        <div className="flex-1">
          <Label htmlFor="endDate">End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal mt-1",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => form.setValue("endDate", date!)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.endDate && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
          )}
        </div>
      </div>

      {startDate && endDate && (
        <div className="text-sm text-muted-foreground">
          Total Days: {eachDayOfInterval({ start: startDate, end: endDate }).length} | Working Days: {calculateWorkingDays(startDate, endDate)}
        </div>
      )}

      <div>
        <Label htmlFor="reason">Reason / Comments</Label>
        <Input
          id="reason"
          {...form.register("reason")}
          className="mt-1"
          placeholder="e.g., Annual vacation, medical appointment"
        />
      </div>

      <div>
        <Label htmlFor="document">Upload Supporting Document (e.g., Medical Certificate)</Label>
        <Input
          id="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          className="mt-1"
        />
        {form.watch("document") && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            <UploadCloud className="h-3 w-3 mr-1" /> Document uploaded.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full">Record Absence</Button>
    </form>
  );
};

export default VacationAbsenceForm;