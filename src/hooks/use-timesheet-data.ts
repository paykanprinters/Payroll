"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { MockEmployee, TimesheetEntry, LeaveEntry } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { calculateTimesheetMetrics, isLeaveDay } from "@/lib/timesheet-utils";
import { TimesheetFormValues, ImportableTimesheetEntry } from "@/lib/timesheet-types"; // Import types from new file
import {
  fetchTimesheetsFromSupabase,
  upsertTimesheetToSupabase,
  deleteTimesheetFromSupabase,
  updateTimesheetStatusInSupabase,
  batchUpsertTimesheetsToSupabase,
  fetchExistingTimesheetsForBatch,
} from "@/integrations/supabase/timesheet-queries"; // Import new Supabase query functions

export const useTimesheetData = (initialTimesheets: TimesheetEntry[], employees: MockEmployee[], leaveRecords: LeaveEntry[], isMockDataEnabled: boolean) => {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>(initialTimesheets);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);
  const [isLoadingTimesheets, setIsLoadingTimesheets] = useState(true);

  // --- Live Timesheet Data Management (Supabase) ---
  const fetchLiveTimesheets = useCallback(async () => {
    setIsLoadingTimesheets(true);
    try {
      const data = await fetchTimesheetsFromSupabase();
      setTimesheets(data);
    } finally {
      setIsLoadingTimesheets(false);
    }
  }, []);

  const upsertLiveTimesheet = useCallback(async (timesheetData: TimesheetEntry) => {
    const toastId = showLoading(timesheetData.id ? "Updating timesheet..." : "Adding new timesheet...") as string;
    setIsLoadingTimesheets(true);
    try {
      const result = await upsertTimesheetToSupabase(timesheetData);
      if (result) {
        setTimesheets(prev => {
          const existingIndex = prev.findIndex(ts => ts.id === result.id);
          if (existingIndex !== -1) {
            return prev.map((ts, idx) => idx === existingIndex ? result : ts);
          } else {
            return [...prev, result];
          }
        });
        showSuccess("Timesheet saved successfully!");
      } else {
        showError("Timesheet saved, but data could not be retrieved. Please refresh.");
        fetchLiveTimesheets(); // Refetch to ensure consistency
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingTimesheets(false);
    }
  }, [fetchLiveTimesheets]);

  const deleteLiveTimesheet = useCallback(async (timesheetId: string) => {
    const toastId = showLoading("Deleting timesheet...") as string;
    setIsLoadingTimesheets(true);
    try {
      const success = await deleteTimesheetFromSupabase(timesheetId);
      if (success) {
        setTimesheets(prev => prev.filter(ts => ts.id !== timesheetId));
        showSuccess("Timesheet deleted successfully!");
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingTimesheets(false);
    }
  }, []);

  const updateLiveTimesheetStatus = useCallback(async (timesheetId: string, newStatus: TimesheetEntry["status"]) => {
    const toastId = showLoading("Updating timesheet status...") as string;
    setIsLoadingTimesheets(true);
    try {
      const result = await updateTimesheetStatusInSupabase(timesheetId, newStatus);
      if (result) {
        setTimesheets(prev => prev.map(ts => ts.id === result.id ? result : ts));
        showSuccess(`Timesheet status updated to ${newStatus}!`);
      } else {
        showError("Timesheet status updated, but data could not be retrieved. Please refresh.");
        fetchLiveTimesheets(); // Refetch to ensure consistency
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingTimesheets(false);
    }
  }, [fetchLiveTimesheets]);

  // Effect to load data based on mockDataEnabled status
  useEffect(() => {
    if (isMockDataEnabled) {
      setTimesheets(initialTimesheets);
      setIsLoadingTimesheets(false);
    } else {
      fetchLiveTimesheets();
    }
  }, [isMockDataEnabled, initialTimesheets, fetchLiveTimesheets]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const addOrUpdateTimesheet = useCallback(async (data: TimesheetFormValues) => {
    console.log("addOrUpdateTimesheet: Received data:", data);
    const employee = employees.find(emp => emp.id === data.employeeId);
    if (!employee) {
      console.error("addOrUpdateTimesheet: Employee not found for ID:", data.employeeId);
      showError("Employee not found. Cannot add/update timesheet.");
      return;
    }

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

    if (isMockDataEnabled) {
      setTimesheets(prevTimesheets => {
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
        localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets }));
        return updatedTimesheets;
      });
    } else {
      // Live data: upsert to Supabase
      let timesheetToUpsert: TimesheetEntry;
      if (isEditing && editingTimesheet) {
        const updatedAuditLog = [...(editingTimesheet.auditLog || []), { action: "Updated", timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const }];
        timesheetToUpsert = { ...editingTimesheet, ...baseTimesheet, auditLog: updatedAuditLog };
      } else {
        const existingTimesheet = timesheets.find(ts => ts.employeeId === data.employeeId && ts.date === formattedDate);
        if (existingTimesheet) {
          const updatedAuditLog = [...(existingTimesheet.auditLog || []), { action: "Updated (Existing)", timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const }];
          timesheetToUpsert = { ...existingTimesheet, ...baseTimesheet, auditLog: updatedAuditLog };
        } else {
          timesheetToUpsert = { ...baseTimesheet, id: uuidv4(), auditLog: [{ action: "Created", timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const }] };
        }
      }
      await upsertLiveTimesheet(timesheetToUpsert);
    }
    setIsEditing(false);
    setEditingTimesheet(null);
  }, [employees, isEditing, editingTimesheet, calculateTimesheetMetrics, isMockDataEnabled, timesheets, upsertLiveTimesheet]);

  const addTimesheetBatch = useCallback(async (newEntries: ImportableTimesheetEntry[]) => {
    if (newEntries.length === 0) {
      return;
    }

    if (isMockDataEnabled) {
      setTimesheets(prevTimesheets => {
        const timesheetMap = new Map<string, TimesheetEntry>();

        prevTimesheets.forEach(ts => {
          timesheetMap.set(`${ts.employeeId}-${ts.date}`, ts);
        });

        newEntries.forEach(data => {
          const employee = employees.find(emp => emp.id === data.employeeId);
          if (!employee) {
            console.warn(`Employee not found for ID: ${data.employeeId}. Skipping timesheet entry for ${format(data.date, "yyyy-MM-dd")}.`);
            return;
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
            status: existingEntry?.status || "Submitted",
            auditLog: [],
          };

          if (existingEntry) {
            const updatedAuditLog = [...(existingEntry.auditLog || []), { action: "Updated (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
            timesheetMap.set(mapKey, { ...existingEntry, ...baseTimesheet, auditLog: updatedAuditLog });
          } else {
            const newId = `TS-${data.employeeId}-${formattedDate}-${Date.now()}`;
            const newAuditLog = [{ action: "Created (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
            timesheetMap.set(mapKey, { ...baseTimesheet, id: newId, auditLog: newAuditLog });
          }
        });

        const finalTimesheets = Array.from(timesheetMap.values());
        localStorage.setItem("mockTimesheets", JSON.stringify(finalTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: finalTimesheets }));
        return finalTimesheets;
      });
    } else {
      // Live data: batch upsert to Supabase
      const timesheetsToUpsert: TimesheetEntry[] = [];
      const existingTimesheetsMap = new Map<string, TimesheetEntry>(); // Key: employeeId-date

      // Fetch existing timesheets for the employees/dates in the batch to determine if it's an update or insert
      const employeeIdsInBatch = Array.from(new Set(newEntries.map(e => e.employeeId)));
      const datesInBatch = Array.from(new Set(newEntries.map(e => format(e.date, "yyyy-MM-dd"))));

      if (employeeIdsInBatch.length > 0 && datesInBatch.length > 0) {
        const existingLiveTimesheets = await fetchExistingTimesheetsForBatch(employeeIdsInBatch, datesInBatch);
        existingLiveTimesheets?.forEach(ts => {
          existingTimesheetsMap.set(`${ts.employeeId}-${ts.date}`, ts);
        });
      }

      newEntries.forEach(data => {
        const employee = employees.find(emp => emp.id === data.employeeId);
        if (!employee) {
          console.warn(`Employee not found for ID: ${data.employeeId}. Skipping timesheet entry for ${format(data.date, "yyyy-MM-dd")}.`);
          return;
        }

        const { totalWorkHours, overtimeHours, lateArrival, earlyDeparture, absent } = calculateTimesheetMetrics(data, employee);
        const formattedDate = format(data.date, "yyyy-MM-dd");
        const mapKey = `${data.employeeId}-${formattedDate}`;

        const existingEntry = existingTimesheetsMap.get(mapKey);

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
          status: existingEntry?.status || "Submitted",
          auditLog: [],
        };

        if (existingEntry) {
          const updatedAuditLog = [...(existingEntry.auditLog || []), { action: "Updated (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
          timesheetsToUpsert.push({ ...existingEntry, ...baseTimesheet, auditLog: updatedAuditLog });
        } else {
          timesheetsToUpsert.push({ ...baseTimesheet, id: uuidv4(), auditLog: [{ action: "Created (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }] });
        }
      });

      if (timesheetsToUpsert.length > 0) {
        const toastId = showLoading(`Importing ${timesheetsToUpsert.length} timesheet entries...`) as string;
        try {
          const success = await batchUpsertTimesheetsToSupabase(timesheetsToUpsert);
          if (success) {
            showSuccess(`${timesheetsToUpsert.length} timesheet entries imported successfully!`);
            fetchLiveTimesheets(); // Re-fetch all to update state
          }
        } finally {
          dismissToast(toastId);
        }
      }
    }
  }, [employees, calculateTimesheetMetrics, isMockDataEnabled, fetchLiveTimesheets, timesheets]);


  const deleteTimesheet = useCallback(async (id: string) => {
    if (isMockDataEnabled) {
      setTimesheets(prevTimesheets => {
        const updatedTimesheets = prevTimesheets.filter(ts => ts.id !== id);
        localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets }));
        showSuccess("Timesheet deleted successfully!");
        return updatedTimesheets;
      });
    } else {
      await deleteLiveTimesheet(id);
    }
  }, [isMockDataEnabled, deleteLiveTimesheet]);

  const updateTimesheetStatus = useCallback(async (id: string, newStatus: TimesheetEntry["status"]) => {
    if (isMockDataEnabled) {
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
        localStorage.setItem("mockTimesheets", JSON.stringify(updatedTimesheets));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: updatedTimesheets }));
        showSuccess(`Timesheet status updated to ${newStatus}!`);
        return updatedTimesheets;
      });
    } else {
      await updateLiveTimesheetStatus(id, newStatus);
    }
  }, [isMockDataEnabled, updateLiveTimesheetStatus]);

  const startEditing = useCallback((timesheet: TimesheetEntry) => {
    setIsEditing(true);
    setEditingTimesheet(timesheet);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingTimesheet(null);
  }, []);

  // Use the external isLeaveDay utility
  const checkIsLeaveDay = useCallback((employeeId: string, date: Date) => {
    return isLeaveDay(employeeId, date, leaveRecords);
  }, [leaveRecords]);

  return {
    timesheets,
    isEditing,
    editingTimesheet,
    getEmployeeName,
    getEmployeeCustomId,
    calculateTimesheetMetrics, // Still exposed for other components if needed
    addOrUpdateTimesheet,
    deleteTimesheet,
    updateTimesheetStatus,
    startEditing,
    cancelEditing,
    isLeaveDay: checkIsLeaveDay, // Expose the wrapped utility function
    addTimesheetBatch,
    isLoadingTimesheets,
  };
};