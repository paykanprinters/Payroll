"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parse, isWithinInterval, addDays } from "date-fns";
import { MockEmployee, TimesheetEntry, LeaveEntry } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import { calculateTimesheetMetrics, isLeaveDay, computeWeeklyIncrementalOvertimeForEntry, getWeeklyPeriodContaining } from "@/lib/timesheet-utils";
import { TimesheetFormValues, ImportableTimesheetEntry } from "@/lib/timesheet-types";
import {
  fetchTimesheetsFromSupabase,
  upsertTimesheetToSupabase,
  deleteTimesheetFromSupabase,
  updateTimesheetStatusInSupabase,
  batchUpsertTimesheetsToSupabase,
  fetchExistingTimesheetsForBatch,
} from "@/integrations/supabase/timesheet-queries";
import type { WorkHoursSettings } from "@/hooks/use-work-hours-settings";
import { usePayCycleSettings } from "@/hooks/use-pay-cycle-settings";

interface UseTimesheetDataProps {
  initialTimesheets: TimesheetEntry[];
  employees: MockEmployee[];
  leaveRecords: LeaveEntry[];
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  workHoursSettings?: WorkHoursSettings | null;
}

export const useTimesheetData = ({
  initialTimesheets,
  employees,
  leaveRecords,
  isMockDataEnabled,
  isAuthenticated,
  isLoadingAuth,
  workHoursSettings,
}: UseTimesheetDataProps) => {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);
  const [isLoadingTimesheets, setIsLoadingTimesheets] = useState(true);

  const weeklyThreshold = (workHoursSettings?.overtimeThresholdHours && workHoursSettings.overtimeThresholdHours > 0)
    ? workHoursSettings.overtimeThresholdHours
    : 41.25;

  const { payCycleSettings } = usePayCycleSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });
  const cutOffDay = payCycleSettings?.cutOffDay ?? 2;
  const workDays = (workHoursSettings?.workDays || []).map(d => d.toLowerCase());

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
        fetchLiveTimesheets();
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
        fetchLiveTimesheets();
      }
    } finally {
      dismissToast(toastId);
      setIsLoadingTimesheets(false);
    }
  }, [fetchLiveTimesheets]);

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingTimesheets(true);
      return;
    }
    if (isMockDataEnabled) {
      setTimesheets(initialTimesheets);
      setIsLoadingTimesheets(false);
    } else if (isAuthenticated) {
      fetchLiveTimesheets();
    } else {
      setTimesheets([]);
      setIsLoadingTimesheets(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, initialTimesheets, fetchLiveTimesheets]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const currentMetricOpts = useCallback(() => ({
    breakDurationMinutes: workHoursSettings?.breakDurationMinutes,
    paidLunch: workHoursSettings?.paidLunch,
    dailyStartTime: workHoursSettings?.dailyStartTime,
    dailyEndTime: workHoursSettings?.dailyEndTime,
    fridayStartTime: workHoursSettings?.fridayStartTime,
    fridayEndTime: workHoursSettings?.fridayEndTime,
    overtimeThresholdHours: workHoursSettings?.overtimeThresholdHours,
  }), [workHoursSettings]);

  const addOrUpdateTimesheet = useCallback(async (data: TimesheetFormValues) => {
    const employee = employees.find(emp => emp.id === data.employeeId);
    if (!employee) {
      showError("Employee not found. Cannot add/update timesheet.");
      return;
    }

    const { totalWorkHours, lateArrival, earlyDeparture, absent } = calculateTimesheetMetrics(
      data,
      employee,
      currentMetricOpts()
    );
    const formattedDate = format(data.date, "yyyy-MM-dd");

    const entryOvertime = computeWeeklyIncrementalOvertimeForEntry(
      data.employeeId,
      formattedDate,
      parseFloat(totalWorkHours.toFixed(2)),
      timesheets,
      weeklyThreshold,
      cutOffDay,
      workDays,
      editingTimesheet?.id ?? undefined
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
      overtimeHours: parseFloat(entryOvertime.toFixed(2)),
      lateArrival,
      earlyDeparture,
      absent,
      status: "Draft",
      auditLog: [],
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
          const existingIndex = prevTimesheets.findIndex(
            (ts) => ts.employeeId === data.employeeId && ts.date === formattedDate
          );
          if (existingIndex !== -1) {
            const existingTs = prevTimesheets[existingIndex];
            const updatedAuditLog = [...(existingTs.auditLog || []), { action: "Updated (Existing)", timestamp: new Date().toISOString(), user: "Current User (Mock)", captureMethod: "Manual" as const }];
            updatedTimesheets = prevTimesheets.map((ts, index) =>
              index === existingIndex
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
      let timesheetToUpsert: TimesheetEntry;
      if (isEditing && editingTimesheet) {
        const updatedAuditLog = [...(editingTimesheet.auditLog || []), { action: "Updated", timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const }];
        timesheetToUpsert = { ...editingTimesheet, ...baseTimesheet, auditLog: updatedAuditLog };
      } else {
        const existing = timesheets.find(ts => ts.employeeId === data.employeeId && ts.date === formattedDate);
        if (existing) {
          const updatedAuditLog = [...(existing.auditLog || []), { action: "Updated (Existing)", timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const }];
          timesheetToUpsert = { ...existing, ...baseTimesheet, auditLog: updatedAuditLog };
        } else {
          timesheetToUpsert = { ...baseTimesheet, id: uuidv4(), auditLog: [{ action: "Created", timestamp: new Date().toISOString(), user: "Current User", captureMethod: "Manual" as const }] };
        }
      }
      await upsertLiveTimesheet(timesheetToUpsert);
    }
    setIsEditing(false);
    setEditingTimesheet(null);
  }, [employees, isEditing, editingTimesheet, isMockDataEnabled, timesheets, upsertLiveTimesheet, weeklyThreshold, currentMetricOpts, cutOffDay, workDays]);

  const addTimesheetBatch = useCallback(async (newEntries: ImportableTimesheetEntry[]) => {
    if (newEntries.length === 0) return;

    const groups = new Map<string, ImportableTimesheetEntry[]>();
    for (const e of newEntries) {
      const { start: periodStart } = getWeeklyPeriodContaining(e.date, cutOffDay);
      const weekStart = format(periodStart, "yyyy-MM-dd");
      const key = `${e.employeeId}__${weekStart}`;
      const arr = groups.get(key) || [];
      arr.push(e);
      groups.set(key, arr);
    }

    const buildBase = (e: ImportableTimesheetEntry, _employee: MockEmployee, entryHours: number, entryOvertime: number): Omit<TimesheetEntry, 'id'> => ({
      employeeId: e.employeeId,
      date: format(e.date, "yyyy-MM-dd"),
      timeIn: e.timeIn,
      teaStart: e.teaStart || undefined,
      teaEnd: e.teaEnd || undefined,
      lunchStart: e.lunchStart || undefined,
      lunchEnd: e.lunchEnd || undefined,
      timeOut: e.timeOut,
      totalWorkHours: parseFloat(entryHours.toFixed(2)),
      overtimeHours: parseFloat(entryOvertime.toFixed(2)),
      lateArrival: false,
      earlyDeparture: false,
      absent: false,
      status: "Submitted",
      auditLog: [],
    });

    if (isMockDataEnabled) {
      setTimesheets(prev => {
        const map = new Map<string, TimesheetEntry>();
        prev.forEach(ts => map.set(`${ts.employeeId}-${ts.date}`, ts));

        for (const [key, arr] of groups) {
          arr.sort((a, b) => a.date.getTime() - b.date.getTime());
          const [empId, weekStart] = key.split("__");
          const weekStartDate = parse(weekStart, "yyyy-MM-dd", new Date());
          const weekEndDate = addDays(weekStartDate, 6);

          const datesInGroup = new Set(arr.map(e => format(e.date, "yyyy-MM-dd")));

          let priorHours = 0;
          for (const ts of prev) {
            if (ts.employeeId !== empId) continue;
            const tsDate = parse(ts.date, "yyyy-MM-dd", new Date());
            if (!isWithinInterval(tsDate, { start: weekStartDate, end: weekEndDate })) continue;
            if (datesInGroup.has(ts.date)) continue;
            priorHours += ts.totalWorkHours || 0;
          }

          for (const e of arr) {
            const employee = employees.find(emp => emp.id === e.employeeId);
            if (!employee) continue;

            const { totalWorkHours } = calculateTimesheetMetrics(
              e,
              employee,
              currentMetricOpts()
            );

            const dayIdx = e.date.getDay(); // 0=Sun,6=Sat
            const isSatNonWork = dayIdx === 6 && !workDays.includes("saturday");
            const isSunNonWork = dayIdx === 0 && !workDays.includes("sunday");
  
            let entryOvertime = 0;
            if (isSatNonWork || isSunNonWork) {
              entryOvertime = totalWorkHours;
              // Do NOT add these hours to priorHours
            } else {
              const overtimeBefore = Math.max(0, priorHours - weeklyThreshold);
              const overtimeAfter = Math.max(0, priorHours + totalWorkHours - weeklyThreshold);
              entryOvertime = Math.min(totalWorkHours, Math.max(0, overtimeAfter - overtimeBefore));
              priorHours += totalWorkHours;
            }

            const key2 = `${e.employeeId}-${format(e.date, "yyyy-MM-dd")}`;
            const existing = map.get(key2);
            if (existing) {
              const updatedAuditLog = [...(existing.auditLog || []), { action: "Updated (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
              map.set(key2, { ...existing, ...buildBase(e, employee, totalWorkHours, entryOvertime), id: existing.id, auditLog: updatedAuditLog });
            } else {
              const newId = `TS-${e.employeeId}-${format(e.date, "yyyy-MM-dd")}-${Date.now()}`;
              const newAuditLog = [{ action: "Created (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }];
              map.set(key2, { ...buildBase(e, employee, totalWorkHours, entryOvertime), id: newId, auditLog: newAuditLog });
            }
          }
        }

        const finalTs = Array.from(map.values());
        localStorage.setItem("mockTimesheets", JSON.stringify(finalTs));
        window.dispatchEvent(new CustomEvent('timesheetsUpdated', { detail: finalTs }));
        return finalTs;
      });
    } else {
      const existingTimesheetsMap = new Map<string, TimesheetEntry>();
      const employeeIdsInBatch = Array.from(new Set(newEntries.map(e => e.employeeId)));
      const datesInBatch = Array.from(new Set(newEntries.map(e => format(e.date, "yyyy-MM-dd"))));

      if (employeeIdsInBatch.length > 0 && datesInBatch.length > 0) {
        const existingLiveTimesheets = await fetchExistingTimesheetsForBatch(employeeIdsInBatch, datesInBatch);
        existingLiveTimesheets?.forEach(ts => {
          existingTimesheetsMap.set(`${ts.employeeId}-${ts.date}`, ts);
        });
      }

      const toUpsert: TimesheetEntry[] = [];

      for (const [key, arr] of groups) {
        arr.sort((a, b) => a.date.getTime() - b.date.getTime());
        const [empId, weekStart] = key.split("__");
        const weekStartDate = parse(weekStart, "yyyy-MM-dd", new Date());
        const weekEndDate = addDays(weekStartDate, 6);
        const datesInGroup = new Set(arr.map(e => format(e.date, "yyyy-MM-dd")));

        let priorHours = 0;
        const allKnown = timesheets;
        for (const ts of allKnown) {
          if (ts.employeeId !== empId) continue;
          const tsDate = parse(ts.date, "yyyy-MM-dd", new Date());
          if (!isWithinInterval(tsDate, { start: weekStartDate, end: weekEndDate })) continue;
          if (datesInGroup.has(ts.date)) continue;

          const idx = tsDate.getDay(); // 0=Sun,6=Sat
          const isSatNonWork = idx === 6 && !workDays.includes("saturday");
          const isSunNonWork = idx === 0 && !workDays.includes("sunday");
          if (isSatNonWork || isSunNonWork) continue; // exclude non-working weekend hours from priorHours

          priorHours += ts.totalWorkHours || 0;
        }

        for (const e of arr) {
          const employee = employees.find(emp => emp.id === e.employeeId);
          if (!employee) continue;

          const { totalWorkHours } = calculateTimesheetMetrics(
            e,
            employee,
            currentMetricOpts()
          );

          // Treat non-working weekend hours as overtime immediately; exclude them from weekly threshold accumulation
          const dayIdx = e.date.getDay(); // 0=Sun, 6=Sat
          const isSatNonWork = dayIdx === 6 && !workDays.includes("saturday");
          const isSunNonWork = dayIdx === 0 && !workDays.includes("sunday");

          let entryOvertime = 0;
          if (isSatNonWork || isSunNonWork) {
            entryOvertime = totalWorkHours;
            // Do NOT add these hours to priorHours (keeps weekly threshold clean)
          } else {
            const overtimeBefore = Math.max(0, priorHours - weeklyThreshold);
            const overtimeAfter = Math.max(0, priorHours + totalWorkHours - weeklyThreshold);
            entryOvertime = Math.min(totalWorkHours, Math.max(0, overtimeAfter - overtimeBefore));
            priorHours += totalWorkHours;
          }

          const base = {
            employeeId: e.employeeId,
            date: format(e.date, "yyyy-MM-dd"),
            timeIn: e.timeIn,
            teaStart: e.teaStart || undefined,
            teaEnd: e.teaEnd || undefined,
            lunchStart: e.lunchStart || undefined,
            lunchEnd: e.lunchEnd || undefined,
            timeOut: e.timeOut,
            totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
            overtimeHours: parseFloat(entryOvertime.toFixed(2)),
            lateArrival: false,
            earlyDeparture: false,
            absent: false,
            status: "Submitted",
            auditLog: [],
          } as Omit<TimesheetEntry, 'id'>;

          const key2 = `${e.employeeId}-${format(e.date, "yyyy-MM-dd")}`;
          const existing = existingTimesheetsMap.get(key2);
          if (existing) {
            toUpsert.push({ ...existing, ...base, auditLog: [...(existing.auditLog || []), { action: "Updated (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }] });
          } else {
            toUpsert.push({ ...base, id: uuidv4(), auditLog: [{ action: "Created (Imported)", timestamp: new Date().toISOString(), user: "System (Import)", captureMethod: "Imported" as const }] });
          }
        }
      }

      if (toUpsert.length > 0) {
        const toastId = showLoading(`Importing ${toUpsert.length} timesheet entries...`) as string;
        try {
          const success = await batchUpsertTimesheetsToSupabase(toUpsert);
          if (success) {
            showSuccess(`${toUpsert.length} timesheet entries imported successfully!`);
            fetchLiveTimesheets();
          }
        } finally {
          dismissToast(toastId);
        }
      }
    }
  }, [employees, isMockDataEnabled, fetchLiveTimesheets, timesheets, weeklyThreshold, currentMetricOpts, cutOffDay, workDays]);

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

  const updateTimesheetStatus = useCallback(async (
    id: string,
    newStatus: TimesheetEntry["status"],
    options?: { silent?: boolean }
  ): Promise<boolean> => {
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
        if (!options?.silent) showSuccess(`Timesheet status updated to ${newStatus}!`);
        return updatedTimesheets;
      });
      return true;
    }

    const result = await updateLiveTimesheetStatus(id, newStatus);
    if (!result) return false;
    setTimesheets((prevTimesheets) =>
      prevTimesheets.map((ts) => (ts.id === id ? result : ts))
    );
    if (!options?.silent) showSuccess(`Timesheet status updated to ${newStatus}!`);
    return true;
  }, [isMockDataEnabled, updateLiveTimesheetStatus]);

  const startEditing = useCallback((timesheet: TimesheetEntry) => {
    setIsEditing(true);
    setEditingTimesheet(timesheet);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingTimesheet(null);
  }, []);

  const checkIsLeaveDay = useCallback((employeeId: string, date: Date) => {
    return isLeaveDay(employeeId, date, leaveRecords);
  }, [leaveRecords]);

  // Focus refresh is handled centrally in usePayrollProcessor.

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
    isLeaveDay: checkIsLeaveDay,
    addTimesheetBatch,
    isLoadingTimesheets,
  };
};