"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isWeekend, eachDayOfInterval, getMonth, getYear } from "date-fns";
import { CalendarIcon, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { showSuccess, showError } from "@/utils/toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MockEmployee {
  id: string;
  firstName: string;
  lastName: string;
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
  documentUrl?: string; // Base64 string for uploaded document
}

// Helper to calculate working days (excluding weekends)
const calculateWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const days = eachDayOfInterval({ start, end });
  for (const day of days) {
    if (!isWeekend(day)) {
      count++;
    }
  }
  return count;
};

const leaveSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: z.enum(["Annual Leave", "Sick Leave", "Unpaid Leave", "Family Responsibility Leave", "Maternity Leave"], { message: "Leave type is required" }),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  reason: z.string().optional(),
  document: z.any().optional(), // For file input
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"],
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const VacationAbsence: React.FC = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [leaveTypeDistribution, setLeaveTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [monthlyLeaveData, setMonthlyLeaveData] = useState<{ name: string; days: number }[]>([]);

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

  const loadData = () => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    if (storedEmployees) {
      setEmployees(JSON.parse(storedEmployees));
    } else {
      setEmployees([]);
    }

    const storedLeaveRecords = localStorage.getItem("mockLeaveRecords");
    if (storedLeaveRecords) {
      const loadedLeaveRecords: LeaveEntry[] = JSON.parse(storedLeaveRecords);
      setLeaveRecords(loadedLeaveRecords);

      // Calculate leave type distribution for PieChart
      const leaveTypeMap = new Map<string, number>();
      loadedLeaveRecords.forEach(record => {
        leaveTypeMap.set(record.leaveType, (leaveTypeMap.get(record.leaveType) || 0) + record.workingDays);
      });
      setLeaveTypeDistribution(
        Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value }))
      );

      // Calculate monthly leave data for BarChart
      const monthlyLeaveMap = new Map<string, number>();
      loadedLeaveRecords.forEach(record => {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        const daysInInterval = eachDayOfInterval({ start, end });

        daysInInterval.forEach(day => {
          if (!isWeekend(day)) {
            const monthYear = format(day, "MMM yyyy");
            monthlyLeaveMap.set(monthYear, (monthlyLeaveMap.get(monthYear) || 0) + 1);
          }
        });
      });

      const sortedMonthlyLeaveData = Array.from(monthlyLeaveMap.entries())
        .map(([name, days]) => ({ name, days }))
        .sort((a, b) => {
          const dateA = new Date(a.name);
          const dateB = new Date(b.name);
          return dateA.getTime() - dateB.getTime();
        });
      setMonthlyLeaveData(sortedMonthlyLeaveData);

    } else {
      setLeaveRecords([]);
      setLeaveTypeDistribution([]);
      setMonthlyLeaveData([]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mockDataUpdated', loadData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadData);
    };
  }, []);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

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

    const newLeave: LeaveEntry = {
      id: `LEAVE-${Date.now()}`,
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: format(data.startDate, "yyyy-MM-dd"),
      endDate: format(data.endDate, "yyyy-MM-dd"),
      totalDays: totalDays,
      workingDays: workingDays,
      reason: data.reason,
      documentUrl: data.document,
    };

    const updatedLeaveRecords = [...leaveRecords, newLeave];
    setLeaveRecords(updatedLeaveRecords);
    localStorage.setItem("mockLeaveRecords", JSON.stringify(updatedLeaveRecords));
    showSuccess("Leave record added successfully!");
    form.reset({
      employeeId: "",
      leaveType: "Annual Leave",
      startDate: undefined,
      endDate: undefined,
      reason: "",
      document: undefined,
    });
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components
  };

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const highlightedDates = leaveRecords.map(record => ({
    from: new Date(record.startDate),
    to: new Date(record.endDate),
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Vacation & Absence Calendar</h1>
      <p className="text-lg text-muted-foreground">
        Manage employee vacation, sick leave, and other absences.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Leave Card */}
        <Card>
          <CardHeader>
            <CardTitle>Record New Absence</CardTitle>
            <CardDescription>
              Enter details for an employee's leave or absence.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Calendar View */}
        <Card>
          <CardHeader>
            <CardTitle>Absence Calendar</CardTitle>
            <CardDescription>
              Visual overview of recorded employee absences.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="range"
              selected={highlightedDates}
              onDayClick={setSelectedCalendarDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Leave Type Distribution</CardTitle>
            <CardDescription>Breakdown of total working days taken by leave type.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {leaveTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} days`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Leave Trends</CardTitle>
            <CardDescription>Total working days taken per month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyLeaveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `${value} days`} />
                <Legend />
                <Bar dataKey="days" fill="#82ca9d" name="Working Days Taken" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leave Records Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>All Leave Records</CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Document</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{getEmployeeName(record.employeeId)}</TableCell>
                      <TableCell>{record.leaveType}</TableCell>
                      <TableCell>{record.startDate}</TableCell>
                      <TableCell>{record.endDate}</TableCell>
                      <TableCell>{record.totalDays}</TableCell>
                      <TableCell>{record.workingDays}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{record.reason || "N/A"}</TableCell>
                      <TableCell>
                        {record.documentUrl ? (
                          <a href={record.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a>
                        ) : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No leave records found.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Leave Management:</h3>
        <p className="text-sm">
          This interface provides the front-end for recording and visualizing employee leave. In a real-world system, leave balances (e.g., remaining annual leave days) would be managed by a backend service, which would also handle complex rules for leave accrual, approval workflows, and integration with payroll for unpaid leave deductions. Document uploads would typically go to secure cloud storage.
        </p>
      </div>
    </div>
  );
};

export default VacationAbsence;