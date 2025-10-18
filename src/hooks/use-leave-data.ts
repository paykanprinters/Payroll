"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { calculateWorkingDays } from "@/lib/payroll-calculations";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { v4 as uuidv4 } from 'uuid'; // Import uuid for mock data generation

// Helper to convert snake_case to camelCase for Supabase data
const convertLeaveEntryKeysToCamelCase = (obj: any): LeaveEntry => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      newObj[camelKey] = obj[key];
    }
  }
  return newObj as LeaveEntry;
};

// Helper to convert camelCase to snake_case for Supabase inserts/updates
const convertLeaveEntryKeysToSnakeCase = (obj: Partial<LeaveEntry>): any => {
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = (obj as any)[key];
    }
  }
  return newObj;
};

export const useLeaveData = (initialLeaveRecords: LeaveEntry[], employees: MockEmployee[], isMockDataEnabled: boolean) => {
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>(initialLeaveRecords);
  const [leaveTypeDistribution, setLeaveTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [monthlyLeaveData, setMonthlyLeaveData] = useState<{ name: string; days: number }[]>([]);
  const [isLoadingLeaveRecords, setIsLoadingLeaveRecords] = useState(true);

  // --- Live Leave Data Management (Supabase) ---
  const fetchLiveLeaveRecords = useCallback(async () => {
    setIsLoadingLeaveRecords(true);
    try {
      console.log("useLeaveData: Fetching live leave records from Supabase...");
      const { data, error } = await supabase
        .from('leave_records')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error("useLeaveData: Error fetching live leave records:", error);
        showError("Failed to load live leave record data.");
        setLeaveRecords([]);
      } else {
        const camelCaseData = data.map(convertLeaveEntryKeysToCamelCase);
        console.log("useLeaveData: Live leave records fetched:", camelCaseData);
        setLeaveRecords(camelCaseData);
      }
    } catch (err) {
      console.error("useLeaveData: Unhandled error fetching live leave records:", err);
      showError("An unexpected error occurred while loading live leave record data.");
      setLeaveRecords([]);
    } finally {
      setIsLoadingLeaveRecords(false);
    }
  }, []);

  const upsertLiveLeaveRecord = useCallback(async (leaveRecordData: LeaveEntry) => {
    const toastId = showLoading(leaveRecordData.id ? "Updating leave record..." : "Adding new leave record...") as string;
    setIsLoadingLeaveRecords(true);
    try {
      const snakeCasePayload = convertLeaveEntryKeysToSnakeCase(leaveRecordData);
      console.log("useLeaveData: Upserting live leave record with payload:", snakeCasePayload);

      const { data, error } = await supabase
        .from('leave_records')
        .upsert(snakeCasePayload, { onConflict: 'id' })
        .select();

      if (error) {
        console.error("useLeaveData: Error upserting live leave record:", error);
        showError(`Failed to save leave record: ${error.message}`);
      } else if (data && data.length > 0) {
        const camelCaseData = convertLeaveEntryKeysToCamelCase(data[0]);
        setLeaveRecords(prev => {
          const existingIndex = prev.findIndex(rec => rec.id === camelCaseData.id);
          if (existingIndex !== -1) {
            return prev.map((rec, idx) => idx === existingIndex ? camelCaseData : rec);
          } else {
            return [...prev, camelCaseData];
          }
        });
        showSuccess("Leave record saved successfully!");
      } else {
        console.warn("useLeaveData: Upsert succeeded but returned no data. Refetching to ensure consistency.");
        showError("Leave record saved, but data could not be retrieved. Please refresh.");
        fetchLiveLeaveRecords();
      }
    } catch (err) {
      console.error("useLeaveData: Unhandled error upserting live leave record:", err);
      showError("An unexpected error occurred while saving leave record data.");
    } finally {
      dismissToast(toastId);
      setIsLoadingLeaveRecords(false);
    }
  }, [fetchLiveLeaveRecords]);

  // Effect to load data based on mockDataEnabled status
  useEffect(() => {
    if (isMockDataEnabled) {
      setLeaveRecords(initialLeaveRecords);
      setIsLoadingLeaveRecords(false);
    } else {
      fetchLiveLeaveRecords();
    }
  }, [isMockDataEnabled, initialLeaveRecords, fetchLiveLeaveRecords]);

  // Recalculate charts whenever leaveRecords changes (either mock or live)
  useEffect(() => {
    if (leaveRecords.length > 0) {
      const leaveTypeMap = new Map<string, number>();
      leaveRecords.forEach(record => {
        leaveTypeMap.set(record.leaveType, (leaveTypeMap.get(record.leaveType) || 0) + record.workingDays);
      });
      setLeaveTypeDistribution(
        Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value }))
      );

      const monthlyLeaveMap = new Map<string, number>();
      leaveRecords.forEach(record => {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        
        if (start <= end) {
          const daysInInterval = eachDayOfInterval({ start, end });

          daysInInterval.forEach(day => {
            if (!isWeekend(day)) {
              const monthYear = format(day, "MMM yyyy");
              monthlyLeaveMap.set(monthYear, (monthlyLeaveMap.get(monthYear) || 0) + 1);
            }
          });
        }
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
      setLeaveTypeDistribution([]);
      setMonthlyLeaveData([]);
    }
  }, [leaveRecords]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const getEmployeeCustomId = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.customEmployeeId : "N/A";
  }, [employees]);

  const addLeaveRecord = useCallback(async (newRecord: Omit<LeaveEntry, 'id'>) => {
    const recordToAdd: LeaveEntry = {
      ...newRecord,
      id: uuidv4(), // Generate ID for both mock and live
    };

    if (isMockDataEnabled) {
      setLeaveRecords(prevRecords => {
        const updatedRecords = [...prevRecords, recordToAdd];
        localStorage.setItem("mockLeaveRecords", JSON.stringify(updatedRecords));
        window.dispatchEvent(new CustomEvent('leaveRecordsUpdated', { detail: updatedRecords }));
        showSuccess("Leave record added successfully!");
        return updatedRecords;
      });
    } else {
      await upsertLiveLeaveRecord(recordToAdd);
    }
  }, [isMockDataEnabled, upsertLiveLeaveRecord]);

  return {
    leaveRecords,
    leaveTypeDistribution,
    monthlyLeaveData,
    getEmployeeName,
    getEmployeeCustomId,
    addLeaveRecord,
    isLoadingLeaveRecords,
  };
};