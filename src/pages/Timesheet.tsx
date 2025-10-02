"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { format, parse, isBefore, isAfter, eachDayOfInterval, isWeekend, addHours, addMinutes } from "date-fns";
import { CalendarIcon, Clock as ClockIcon, CheckCircle, XCircle, Hourglass, Lock, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { MockEmployee, TimesheetEntry, LeaveEntry } from "@/lib/mock-data-interfaces";

// Helper to calculate time difference in hours
const calculateTimeDifferenceInHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const startDate = parse(start, 'HH:mm', new Date());
  const endDate = parse(end, 'HH:mm', new Date());
  if (isBefore(endDate, startDate)) {
    // If end time is before start time, assume it's on the next day for calculation
    endDate.setDate(endDate.getDate() + 1);
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

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

type TimesheetFormValues = z.infer<typeof timesheetSchema>;

const Timesheet: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null);

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

  const loadData = useCallback(() => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    setEmployees(storedEmployees ? JSON.parse(storedEmployees) : []);

    const storedTimesheets = localStorage.getItem("mockTimesheets");
    setTimesheets(storedTimesheets ? JSON.parse(storedTimesheets) : []);

    const storedLeaveRecords = localStorage.getItem("mockLeaveRecords");
    setLeaveRecords(storedLeaveRecords ? JSON.parse(storedLeaveRecords) : []);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('mockDataUpdated', loadData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadData);
    };
  }, [loadData]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const calculateTimesheetMetrics = (data: TimesheetFormValues, employee?: MockEmployee) => {
    const standardDailyHours = employee?.standardDailyHours || 8; // Default to 8 hours

    let totalWorkHours = 0;
    let overtimeHours = 0;
    let lateArrival = false;
    let earlyDeparture = false;
    let absent = false;

    const timeIn = data.timeIn;
    const timeOut = data.timeOut;

    if (!timeIn || !timeOut) {
      absent = true;
    } else {
      const totalShiftDuration = calculateTimeDifferenceInHours(timeIn, timeOut);
      const teaDuration = calculateTimeDifferenceInHours(data.teaStart || "", data.teaEnd || "");
      const lunchDuration = calculateTimeDifferenceInHours(data.lunchStart || "", data.lunchEnd || "");

      totalWorkHours = totalShiftDuration - teaDuration - lunchDuration;
      overtimeHours = Math.max(0, totalWorkHours - standardDailyHours);

      // Late Arrival / Early Departure (simplified logic)
      const expectedTimeIn = parse("09:00", 'HH:mm', new Date());
      const actualTimeIn = parse(timeIn, 'HH:mm', new Date());
      if (isAfter(actualTimeIn, expectedTimeIn)) {
        lateArrival = true;
      }

      const expectedTimeOut = parse("17:00", 'HH:mm', new Date());
      const actualTimeOut = parse(timeOut, 'HH:mm', new Date());
      if (isBefore(actualTimeOut, expectedTimeOut)) {
        earlyDeparture = true;
      }
    }

    return { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent };
  };

  const onSubmit = (data: TimesheetFormValues) => {
    const employee = employees.find(emp => emp.id === data.employeeId);
    const { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent } = calculateTimesheetMetrics(data, employee);

    const formattedDate = format(data.date, "yyyy-MM-dd");

    // Check for existing timesheet for the same employee and date
    const existingTimesheetIndex = timesheets.findIndex(
      (ts) => ts.employeeId === data.employeeId && ts.date === formattedDate
    );

    const baseTimesheet: Omit<TimesheetEntry, 'id'> = {
      employeeId: data.employeeId,
      date: formattedDate,
      timeIn: data.timeIn,
      teaStart: data.teaStart || undefined,
      teaEnd: data.teaEnd || undefined,
      lunchStart: data.lunchStart || undefined,
      lunchEnd: data.lunchEnd || undefined,
      timeOut: data.timeOut,
      totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      lateArrival: lateArrival,
      earlyDeparture: earlyDeparture,
      absent: absent,
      status: "Draft", // Default status for new entries
      auditLog: [{ action: isEditing ? "Updated" : "Created", timestamp: new Date().toISOString(), user: "Current User (Mock)" }],
    };

    let updatedTimesheets: TimesheetEntry[];

    if (isEditing && editingTimesheetId) {
      updatedTimesheets = timesheets.map((ts) =>
        ts.id === editingTimesheetId
          ? { ...ts, ...baseTimesheet, id: editingTimesheetId, auditLog: [...(ts.auditLog || []), { action: "Edited", timestamp: new Date().toISOString(), user: "Current User (Mock)" }] }
          : ts
      );
      showSuccess("Timesheet updated successfully!");
    } else if (existingTimesheetIndex !== -1) {
      // If an existing timesheet is found, update it
      updatedTimesheets = timesheets.map((ts, index) =>
        index === existingTimesheetIndex
          ? { ...ts, ...baseTimesheet, id: ts.id, auditLog: [...(ts.auditLog || []), { action: "Updated (Existing)", timestamp: new Date().toISOString(), user: "Current User (Mock)" }] }
          : ts
      );
      showSuccess("Existing timesheet updated successfully!");
    } else {
      // Add new timesheet
      const newId = `TS-${data.employeeId}-${formattedDate}-${Date.now()}`;
      updatedTimesheets = [...timesheets, { ...baseTimesheet, id: newId }];
      showSuccess("Timesheet added successfully!");
    }

    setTimesheets(updatedTimesheets);
    localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
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
    setIsEditing(false);
    setEditingTimesheetId(null);
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components
  };

  const handleEdit = (timesheet: TimesheetEntry) => {
    setIsEditing(true);
    setEditingTimesheetId(timesheet.id);
    form.reset({
      employeeId: timesheet.employeeId,
      date: parse(timesheet.date, "yyyy-MM-dd", new Date()),
      timeIn: timesheet.timeIn,
      teaStart: timesheet.teaStart || "",
      teaEnd: timesheet.teaEnd || "",
      lunchStart: timesheet.lunchStart || "",
      lunchEnd: timesheet.lunchEnd || "",
      timeOut: timesheet.timeOut,
    });
  };

  const handleDelete = (id: string) => {
    const updatedTimesheets = timesheets.filter(ts => ts.id !== id);
    setTimesheets(updatedTimesheets);
    localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
    showSuccess("Timesheet deleted successfully!");
    window.dispatchEvent(new Event('mockDataUpdated'));
  };

  const handleStatusChange = (id: string, newStatus: TimesheetEntry["status"]) => {
    const updatedTimesheets = timesheets.map(ts => {
      if (ts.id === id) {
        const auditEntry = { action: `Status changed to ${newStatus}`, timestamp: new Date().toISOString(), user: "Current User (Mock)" };
        return {
          ...ts,
          status: newStatus,
          submittedBy: newStatus === "Submitted" ? "Current User (Mock)" : ts.submittedBy,
          submittedAt: newStatus === "Submitted" ? new Date().toISOString() : ts.submittedAt,
          approvedBy: newStatus === "Approved" ? "Admin User (Mock)" : ts.approvedBy,
          approvedAt: newStatus === "Approved" ? new Date().toISOString() : ts.approvedAt,
          auditLog: [...(ts.auditLog || []), auditEntry],
        };
      }
      return ts;
    });
    setTimesheets(updatedTimesheets);
    localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
    showSuccess(`Timesheet status updated to ${newStatus}!`);
    window.dispatchEvent(new Event('mockDataUpdated'));
  };

  const isLeaveDay = (employeeId: string, date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    return leaveRecords.some(
      (record) =>
        record.employeeId === employeeId &&
        record.startDate <= formattedDate &&
        record.endDate >= formattedDate
    );
  };

  const selectedEmployeeId = form.watch("employeeId");
  const selectedDate = form.watch("date");
  const isCurrentDayLeave = selectedEmployeeId && selectedDate ? isLeaveDay(selectedEmployeeId, selectedDate) : false;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Timesheet Management</h1>
      <p className="text-lg text-muted-foreground">
        Accurately track employee working hours, breaks, and calculate payroll-related metrics.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Timesheet Entry" : "Record Daily Time"}</CardTitle>
          <CardDescription>
            Enter daily clock-in/out times and breaks for an employee.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !form.watch("date") && "text-muted-foreground"
                    )}
                    disabled={isEditing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("date") ? format(form.watch("date"), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("date")}
                    onSelect={(date) => form.setValue("date", date!)}
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

            <Button type="submit" className="w-full">
              {isEditing ? "Save Changes" : "Record Time"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Timesheet Entries</CardTitle>
          <CardDescription>Overview of recorded employee working hours.</CardDescription>
        </CardHeader>
        <CardContent>
          {timesheets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Flags</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timesheets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{getEmployeeName(entry.employeeId)}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.timeIn || "N/A"}</TableCell>
                      <TableCell>{entry.timeOut || "N/A"}</TableCell>
                      <TableCell>{entry.totalWorkHours.toFixed(2)}</TableCell>
                      <TableCell>{entry.overtimeHours.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            entry.status === "Approved" && "bg-green-100 text-green-800",
                            entry.status === "Submitted" && "bg-blue-100 text-blue-800",
                            entry.status === "Draft" && "bg-gray-100 text-gray-800",
                            entry.status === "Locked" && "bg-red-100 text-red-800",
                          )}
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {entry.absent && <XCircle className="h-4 w-4 text-red-500" title="Absent" />}
                          {entry.lateArrival && <ClockIcon className="h-4 w-4 text-yellow-500" title="Late Arrival" />}
                          {entry.earlyDeparture && <ClockIcon className="h-4 w-4 text-orange-500" title="Early Departure" />}
                          {!entry.absent && !entry.lateArrival && !entry.earlyDeparture && <CheckCircle className="h-4 w-4 text-green-500" title="No Flags" />}
                        </div>
                      </TableCell>
                      <TableCell className="flex justify-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(entry)} disabled={entry.status === "Approved" || entry.status === "Locked"}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(entry.id)} disabled={entry.status === "Approved" || entry.status === "Locked"}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Select onValueChange={(value: TimesheetEntry["status"]) => handleStatusChange(entry.id, value)} value={entry.status} disabled={entry.status === "Locked"}>
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Submitted">Submitted</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Locked">Locked</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No timesheet entries found.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Timesheet Module Notes:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>**Automated Calculations**: Total work hours, overtime, late/early flags, and absenteeism are calculated dynamically based on entered times.</li>
          <li>**Approval Workflow**: Timesheets can transition through Draft, Submitted, Approved, and Locked states. Only Draft and Submitted entries are editable.</li>
          <li>**Integration Points**: In a full system, this module would feed data directly into the payroll engine for accurate salary and overtime calculations. It would also check against the leave module for approved absences.</li>
          <li>**Mock Data**: All data is currently stored in your browser's local storage. Enable mock data in settings to populate initial entries.</li>
        </ul>
      </div>
    </div>
  );
};

export default Timesheet;