"use client";

import React, { useState, useEffect, useCallback } from "react";
import { eachDayOfInterval, isWeekend, format } from "date-fns";

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
  documentUrl?: string;
}

// Helper to calculate working days (excluding weekends)
export const calculateWorkingDays = (start: Date, end: Date): number => {
  let count = 0;
  const days = eachDayOfInterval({ start, end });
  for (const day of days) {
    if (!isWeekend(day)) {
      count++;
    }
  }
  return count;
};

export const useLeaveData = () => {
  const [employees, setEmployees] = useState<MockEmployee[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [leaveTypeDistribution, setLeaveTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [monthlyLeaveData, setMonthlyLeaveData] = useState<{ name: string; days: number }[]>([]);

  const getEmployeeName = useCallback((employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  }, [employees]);

  const loadData = useCallback(() => {
    const storedEmployees = localStorage.getItem("mockEmployees");
    setEmployees(storedEmployees ? JSON.parse(storedEmployees) : []);

    const storedLeaveRecords = localStorage.getItem("mockLeaveRecords");
    const loadedLeaveRecords: LeaveEntry[] = storedLeaveRecords ? JSON.parse(storedLeaveRecords) : [];
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
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('mockDataUpdated', loadData);
    return () => {
      window.removeEventListener('mockDataUpdated', loadData);
    };
  }, [loadData]);

  const addLeaveRecord = useCallback((newRecord: LeaveEntry) => {
    setLeaveRecords(prevRecords => {
      const updatedRecords = [...prevRecords, newRecord];
      localStorage.setItem("mockLeaveRecords", JSON.stringify(updatedRecords));
      return updatedRecords;
    });
    window.dispatchEvent(new Event('mockDataUpdated')); // Notify other components
  }, []);

  return {
    employees,
    leaveRecords,
    leaveTypeDistribution,
    monthlyLeaveData,
    getEmployeeName,
    addLeaveRecord,
    loadData, // Expose loadData for explicit refresh if needed
  };
};