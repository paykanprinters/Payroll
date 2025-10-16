"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { calculateWorkingDays } from "@/lib/utils";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";

export const useLeaveData = (initialLeaveRecords: LeaveEntry[], employees: MockEmployee[], isMockDataEnabled: boolean) => {
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>(initialLeaveRecords);
  const [leaveTypeDistribution, setLeaveTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [monthlyLeaveData, setMonthlyLeaveData] = useState<{ name: string; days: number }[]>([]);

  useEffect(() => {
    setLeaveRecords(initialLeaveRecords);
    // Recalculate charts whenever initialLeaveRecords changes
    if (initialLeaveRecords.length > 0) {
      // Calculate leave type distribution for PieChart
      const leaveTypeMap = new Map<string, number>();
      initialLeaveRecords.forEach(record => {
        leaveTypeMap.set(record.leaveType, (leaveTypeMap.get(record.leaveType) || 0) + record.workingDays);
      });
      setLeaveTypeDistribution(
        Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value }))
      );

      // Calculate monthly leave data for BarChart
      const monthlyLeaveMap = new Map<string, number>();
      initialLeaveRecords.forEach(record => {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        
        // Ensure interval is valid before calculating days
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
  }, [initialLeaveRecords]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const addLeaveRecord = useCallback((newRecord: LeaveEntry) => {
    setLeaveRecords(prevRecords => {
      const updatedRecords = [...prevRecords, newRecord];
      if (isMockDataEnabled) {
        localStorage.setItem("mockLeaveRecords", JSON.stringify(updatedRecords));
        window.dispatchEvent(new CustomEvent('leaveRecordsUpdated', { detail: updatedRecords })); // Dispatch specific event
      }
      return updatedRecords;
    });
  }, [isMockDataEnabled]);

  return {
    leaveRecords,
    leaveTypeDistribution,
    monthlyLeaveData,
    getEmployeeName,
    addLeaveRecord,
  };
};