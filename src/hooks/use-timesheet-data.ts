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

// Define the expected input type for adding/updating timesheets
export interface TimesheetFormValues {
  employeeId: string;
  date: Date; // Expecting a Date object now
  timeIn: string;
  teaStart?: string;
  teaEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  timeOut: string;
}

// Define the expected input type for batch imports
export interface ImportableTimesheetEntry {
  employeeId: string;
  date: Date; // Expecting a Date object
  timeIn: string;
  teaStart?: string;
  teaEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  timeOut: string;
}

export const useTimesheetData = (initialTimesheets: TimesheetEntry[], employees: MockEmployee[], leaveRecords: LeaveEntry[], isMockDataEnabled: boolean) => {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>(initialTimesheets);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);

  useEffect(() => {
    setTimesheets(initialTimesheets);
  }, [initialTimesheets]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const calculateTimesheetMetrics = useCallback((data: TimesheetFormValues | ImportableTimesheetEntry, employee?: MockEmployee) => {
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
    console.log("addOrUpdateTimesheet: Received data:", data); // Log incoming data
    setTimesheets(prevTimesheets => {
      const employee = employees.find(emp => emp.id === data.employeeId);
      if (!employee) {
        console.error("addOrUpdateTimesheet: Employee not found for ID:", data.employeeId);
        showError("Employee not found. Cannot add/update timesheet.");
        return prevTimesheets; // Return previous state if employee not found
      }

      const { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent } = calculateTimesheetMetrics(data, employee);

      const formattedDate = format(data.date, "yyyy-MM-dd");
      console.log("addOrUpdateTimesheet: Formatted date:", formattedDate);

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
        updatedTimesheets = prevTimesheets.map((ts) =>
          ts.id === editingTimesheet.id
            ? { ...ts, ...baseTimesheet, id: editingTimesheet.id, auditLog: updatedAuditLog }
            : ts
        );
        showSuccess("Timesheet updated successfully!");
      } else {
        // Check for existing timesheet for the same employee and date
        const existingTimesheetIndex = prevTimesheets.findIndex(
          (ts) => ts.employeeId === data.employeeId && ts.date === formattedDate
        );

        if (existingTimesheetIndex !== -1) {
          const existingTs = prevTimesheets[existingTimesheetIndex];
          const updatedAuditLog = [...(existingTs.auditLog || []), { action: "Updated (Existing)", timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const }];
          updatedTimesheets = prevTimesheets.map((ts, index) =>
            index === existingTimesheetIndex
              ? { ...ts, ...baseTimesheet, id: ts.id, auditLog: updatedAuditLog }
              : ts
          );
          showSuccess("Existing timesheet updated successfully!");
        } else {
          const newId = `TS-${data.employeeId}-${formattedDate}-${Date.now()}`;
          const newAuditLog = [{ action: "Created", timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const }];
          updatedTimesheets = [...prevTimesheets, { ...baseTimesheet, id: newId, auditLog: newAuditLog }];
          showSuccess("Timesheet added successfully!");
        }
      }
      if (isMockDataEnabled) {
        localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets })); // Dispatch specific event
      }
      return updatedTimesheets;
    });
    setIsEditing(false);
    setEditingTimesheet(null);
  }, [employees, isEditing, editingTimesheet, calculateTimesheetMetrics, isMockDataEnabled]);

  const addTimesheetBatch = useCallback((newEntries: ImportableTimesheetEntry[]) => {
    if (newEntries.length === 0) {
      return;
    }

    setTimesheets(prevTimesheets => {
      const timesheetMap = new Map<string, TimesheetEntry>(); // Key: employeeId-date, Value: TimesheetEntry

      // Populate map with existing timesheets for efficient lookup/update
      prevTimesheets.forEach(ts => {
        timesheetMap.set(`${ts.employeeId}-${ts.date}`, ts);
      });

      newEntries.forEach(data => {
        const employee = employees.find(emp => emp.id === data.employeeId);
        if (!employee) {
          console.warn(`Employee not found for ID: ${data.employeeId}. Skipping timesheet entry for ${format(data.date, "yyyy-MM-dd")}.`);
          return; // Skip this entry if employee not found
        }

        const { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent } = calculateTimesheetMetrics(data, employee);
        const formattedDate = format(data.date, "yyyy-MM-dd");
        const mapKey = `${data.employeeId}-${formattedDate}`;

        const existingEntry = timesheetMap.get(mapKey);

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
          status: existingEntry?.status || "Submitted", // Default to Submitted for imported, or keep existing
          auditLog: [],
        };

        if (existingEntry) {
          // Update existing entry
          const updatedAuditLog = [...(existingEntry.auditLog || []), { action: "Updated (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
          timesheetMap.set(mapKey, { ...existingEntry, ...baseTimesheet, auditLog: updatedAuditLog });
        } else {
          // Add new entry
          const newId = `TS-${data.employeeId}-${formattedDate}-${Date.now()}`;
          const newAuditLog = [{ action: "Created (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
          timesheetMap.set(mapKey, { ...baseTimesheet, id: newId, auditLog: newAuditLog });
        }
      });

      const finalTimesheets = Array.from(timesheetMap.values());
      if (isMockDataEnabled) {
        localStorage.setItem("mockTimesheets", JSON.stringify(finalTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: finalTimesheets })); // Dispatch specific event
      }
      return finalTimesheets;
    });
  }, [employees, calculateTimesheetMetrics, isMockDataEnabled]);

  const deleteTimesheet = useCallback((id: string) => {
    setTimesheets(prevTimesheets => {
      const updatedTimesheets = prevTimesheets.filter(ts => ts.id !== id);
      if (isMockDataEnabled) {
        localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets })); // Dispatch specific event
      }
      showSuccess("Timesheet deleted successfully!");
      return updatedTimesheets;
    });
  }, [isMockDataEnabled]);

  const updateTimesheetStatus = useCallback((id: string, newStatus: TimesheetEntry["status"]) => {
    setTimesheets(prevTimesheets => {
      const updatedTimesheets = prevTimesheets.map(ts => {
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
      if (isMockDataEnabled) {
        localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets })); // Dispatch specific event
      }
      showSuccess(`Timesheet status updated to ${newStatus}!`);
      return updatedTimesheets;
    });
  }, [isMockDataEnabled]);

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
    timesheets,
    isEditing,
    editingTimesheet,
    getEmployeeName,
    getEmployeeCustomId, // Expose new helper
    calculateTimesheetMetrics,
    addOrUpdateTimesheet,
    deleteTimesheet,
    updateTimesheetStatus,
    startEditing,
    cancelEditing,
    isLeaveDay,
    addTimesheetBatch,
  };
};