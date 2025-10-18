"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parse, isBefore, isAfter, eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee, TimesheetEntry, LeaveEntry } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation

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

// Helper to convert snake_case to camelCase for Supabase data
const convertTimesheetKeysToCamelCase = (obj: any): TimesheetEntry => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as TimesheetEntry;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertTimesheetKeysToSnakeCase = (obj: Partial<TimesheetEntry>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const useTimesheetData = (initialTimesheets: TimesheetEntry[], employees: MockEmployee[], leaveRecords: LeaveEntry[], isMockDataEnabled: boolean) => {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>(initialTimesheets);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);
  const [isLoadingTimesheets, setIsLoadingTimesheets] = useState(true);

  // --- Live Timesheet Data Management (Supabase) ---
  const fetchLiveTimesheets = useCallback(async () => {
    setIsLoadingTimesheets(true);
    try {
      console.log("useTimesheetData: Fetching live timesheets from Supabase...");
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error("useTimesheetData: Error fetching live timesheets:", error);
        showError("Failed to load live timesheet data.");
        setTimesheets([]);
      } else {
        const camelCaseData = data.map(convertTimesheetKeysToCamelCase);
        console.log("useTimesheetData: Live timesheets fetched:", camelCaseData);
        setTimesheets(camelCaseData);
      }
    } catch (err) {
      console.error("useTimesheetData: Unhandled error fetching live timesheets:", err);
      showError("An unexpected error occurred while loading live timesheet data.");
      setTimesheets([]);
    } finally {
      setIsLoadingTimesheets(false);
    }
  }, []);

  const upsertLiveTimesheet = useCallback(async (timesheetData: TimesheetEntry) => {
    const toastId = showLoading(timesheetData.id ? "Updating timesheet..." : "Adding new timesheet...") as string;
    setIsLoadingTimesheets(true);
    try {
      const snakeCasePayload = convertTimesheetKeysToSnakeCase(timesheetData);
      console.log("useTimesheetData: Upserting live timesheet with payload:", snakeCasePayload);

      const { data, error } = await supabase
        .from('timesheets')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("useTimesheetData: Error upserting live timesheet:", error);
        showError(`Failed to save timesheet: ${error.message}`);
      } else if (data && data.length > 0) {
        const camelCaseData = convertTimesheetKeysToCamelCase(data[0]);
        setTimesheets(prev => {
          const existingIndex = prev.findIndex(ts => ts.id === camelCaseData.id);
          if (existingIndex !== -1) {
            return prev.map((ts, idx) => idx === existingIndex ? camelCaseData : ts);
          } else {
            return [...prev, camelCaseData];
          }
        });
        showSuccess("Timesheet saved successfully!");
      } else {
        console.warn("useTimesheetData: Upsert succeeded but returned no data. Refetching to ensure consistency.");
        showError("Timesheet saved, but data could not be retrieved. Please refresh.");
        fetchLiveTimesheets();
      }
    } catch (err) {
      console.error("useTimesheetData: Unhandled error upserting live timesheet:", err);
      showError("An unexpected error occurred while saving timesheet data.");
    } finally {
      dismissToast(toastId);
      setIsLoadingTimesheets(false);
    }
  }, [fetchLiveTimesheets]);

  const deleteLiveTimesheet = useCallback(async (timesheetId: string) => {
    const toastId = showLoading("Deleting timesheet...") as string;
    setIsLoadingTimesheets(true);
    try {
      console.log("useTimesheetData: Deleting live timesheet with ID:", timesheetId);
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', timesheetId);

      if (error) {
        console.error("useTimesheetData: Error deleting live timesheet:", error);
        showError(`Failed to delete timesheet: ${error.message}`);
      } else {
        setTimesheets(prev => prev.filter(ts => ts.id !== timesheetId));
        showSuccess("Timesheet deleted successfully!");
      }
    } catch (err) {
      console.error("useTimesheetData: Unhandled error deleting live timesheet:", err);
      showError("An unexpected error occurred while deleting timesheet data.");
    } finally {
      dismissToast(toastId);
      setIsLoadingTimesheets(false);
    }
  }, []);

  const updateLiveTimesheetStatus = useCallback(async (timesheetId: string, newStatus: TimesheetEntry["status"]) => {
    const toastId = showLoading("Updating timesheet status...") as string;
    setIsLoadingTimesheets(true);
    try {
      const auditEntry = { action: `Status changed to ${newStatus}`, timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const };
      const { data, error } = await supabase
        .from('timesheets')
        .update({ status: newStatus, audit_log: supabase.fn.jsonb_insert('audit_log', '{$}', JSON.stringify(auditEntry), true) })
        .eq('id', timesheetId)
        .select();

      if (error) {
        console.error("useTimesheetData: Error updating live timesheet status:", error);
        showError(`Failed to update timesheet status: ${error.message}`);
      } else if (data && data.length > 0) {
        const camelCaseData = convertTimesheetKeysToCamelCase(data[0]);
        setTimesheets(prev => prev.map(ts => ts.id === camelCaseData.id ? camelCaseData : ts));
        showSuccess(`Timesheet status updated to ${newStatus}!`);
      } else {
        console.warn("useTimesheetData: Status update succeeded but returned no data. Refetching to ensure consistency.");
        showError("Timesheet status updated, but data could not be retrieved. Please refresh.");
        fetchLiveTimesheets();
      }
    } catch (err) {
      console.error("useTimesheetData: Unhandled error updating live timesheet status:", err);
      showError("An unexpected error occurred while updating timesheet status.");
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
        const { data: existingLiveTimesheets, error: fetchError } = await supabase
          .from('timesheets')
          .select('*')
          .in('employee_id', employeeIdsInBatch)
          .in('date', datesInBatch);

        if (fetchError) {
          console.error("useTimesheetData: Error fetching existing timesheets for batch:", fetchError);
          showError("Failed to check for existing timesheets during import.");
          return;
        }
        existingLiveTimesheets?.forEach(ts => {
          existingTimesheetsMap.set(`${ts.employee_id}-${ts.date}`, convertTimesheetKeysToCamelCase(ts));
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
          const snakeCasePayloads = timesheetsToUpsert.map(convertTimesheetKeysToSnakeCase);
          const { error } = await supabase
            .from('timesheets')
            .upsert(snakeCasePayloads, { onConflict: 'id' });

          if (error) {
            console.error("useTimesheetData: Error batch upserting live timesheets:", error);
            showError(`Failed to import timesheets: ${error.message}`);
          } else {
            showSuccess(`${timesheetsToUpsert.length} timesheet entries imported successfully!`);
            fetchLiveTimesheets(); // Re-fetch all to update state
          }
        } catch (err) {
          console.error("useTimesheetData: Unhandled error batch upserting live timesheets:", err);
          showError("An unexpected error occurred during timesheet import.");
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
    getEmployeeCustomId,
    calculateTimesheetMetrics,
    addOrUpdateTimesheet,
    deleteTimesheet,
    updateTimesheetStatus,
    startEditing,
    cancelEditing,
    isLeaveDay,
    addTimesheetBatch,
    isLoadingTimesheets,
  };
};