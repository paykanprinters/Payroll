"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parse, isBefore, isAfter, eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee, TimesheetEntry, LeaveEntry } from "@/lib/mock-data-interfaces";
import { showSuccess, showError } from "@/utils/toast";

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

interface TimesheetFormValues {
  employeeId: string;
  date: Date;
  timeIn: string;
  teaStart?: string;
  teaEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  timeOut: string;
}

export const useTimesheetData = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);

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

  const calculateTimesheetMetrics = useCallback((data: TimesheetFormValues, employee?: MockEmployee) => {
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
  }, []);

  const addOrUpdateTimesheet = useCallback((data: TimesheetFormValues) => {
    const employee = employees.find(emp => emp.id === data.employeeId);
    const { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent } = calculateTimesheetMetrics(data, employee);

    const formattedDate = format(data.date, "yyyy-MM-dd");

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
      auditLog: [], // Initialize auditLog
    };

    let updatedTimesheets: TimesheetEntry[];

    if (isEditing && editingTimesheet) {
      const updatedAuditLog = [...(editingTimesheet.auditLog || []), { action: "Updated", timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const }];
      updatedTimesheets = timesheets.map((ts) =>
        ts.id === editingTimesheet.id
          ? { ...ts, ...baseTimesheet, id: editingTimesheet.id, auditLog: updatedAuditLog }
          : ts
      );
      showSuccess("Timesheet updated successfully!");
    } else {
      // Check for existing timesheet for the same employee and date
      const existingTimesheetIndex = timesheets.findIndex(
        (ts) => ts.employeeId === data.employeeId && ts.date === formattedDate
      );

      if (existingTimesheetIndex !== -1) {
        const existingTs = timesheets[existingTimesheetIndex];
        const updatedAuditLog = [...(existingTs.auditLog || []), { action: "Updated (Existing)", timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const }];
        updatedTimesheets = timesheets.map((ts, index) =>
          index === existingTimesheetIndex
            ? { ...ts, ...baseTimesheet, id: ts.id, auditLog: updatedAuditLog }
            : ts
        );
        showSuccess("Existing timesheet updated successfully!");
      } else {
        const newId = `TS-${data.employeeId}-${formattedDate}-${Date.now()}`;
        const newAuditLog = [{ action: "Created", timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const }];
        updatedTimesheets = [...timesheets, { ...baseTimesheet, id: newId, auditLog: newAuditLog }];
        showSuccess("Timesheet added successfully!");
      }
    }

    setTimesheets(updatedTimesheets);
    localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
    setIsEditing(false);
    setEditingTimesheet(null);
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components
  }, [employees, timesheets, isEditing, editingTimesheet, calculateTimesheetMetrics]);

  const deleteTimesheet = useCallback((id: string) => {
    const updatedTimesheets = timesheets.filter(ts => ts.id !== id);
    setTimesheets(updatedTimesheets);
    localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
    showSuccess("Timesheet deleted successfully!");
    window.dispatchEvent(new Event('mockDataUpdated'));
  }, [timesheets]);

  const updateTimesheetStatus = useCallback((id: string, newStatus: TimesheetEntry["status"]) => {
    const updatedTimesheets = timesheets.map(ts => {
      if (ts.id === id) {
        const auditEntry = { action: `Status changed to ${newStatus}`, timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const };
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
  }, [timesheets]);

  const startEditing = useCallback((timesheet: TimesheetEntry) => {
    setIsEditing(true);
    setEditingTimesheet(timesheet);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingTimesheet(null);
  }, []);

  const isLeaveDay = useCallback((employeeId: string, date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    return leaveRecords.some(
      (record) =>
        record.employeeId === employeeId &&
        record.startDate <= formattedDate &&
        record.endDate >= formattedDate
    );
  }, [leaveRecords]);

  return {
    employees,
    timesheets,
    leaveRecords,
    isEditing,
    editingTimesheet,
    getEmployeeName,
    calculateTimesheetMetrics,
    addOrUpdateTimesheet,
    deleteTimesheet,
    updateTimesheetStatus,
    startEditing,
    cancelEditing,
    isLeaveDay,
  };
};