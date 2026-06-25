"use client";

import { useState, useEffect, useCallback } from "react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { calculateWorkingDays } from "@/lib/payroll-calculations";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import {
  fetchLeaveRecordsFromSupabase,
  upsertLeaveRecordToSupabase,
  deleteLeaveRecordFromSupabase,
} from "@/integrations/supabase/leave-queries";
import { recordAuditEvent } from "@/lib/audit-trail";

interface UseLeaveDataProps {
  initialLeaveRecords: LeaveEntry[];
  employees: MockEmployee[];
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

export type AddLeaveRecordOptions = {
  asStaffRequest?: boolean;
};

function persistMockLeaveRecords(records: LeaveEntry[]) {
  localStorage.setItem("mockLeaveRecords", JSON.stringify(records));
  window.dispatchEvent(new CustomEvent("leaveRecordsUpdated", { detail: records }));
}

export const useLeaveData = ({
  initialLeaveRecords,
  employees,
  isMockDataEnabled,
  isAuthenticated,
  isLoadingAuth,
}: UseLeaveDataProps) => {
  const { user } = useAuth();
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntry[]>([]);
  const [leaveTypeDistribution, setLeaveTypeDistribution] = useState<{ name: string; value: number }[]>([]);
  const [monthlyLeaveData, setMonthlyLeaveData] = useState<{ name: string; days: number }[]>([]);
  const [isLoadingLeaveRecords, setIsLoadingLeaveRecords] = useState(true);

  const fetchLiveLeaveRecords = useCallback(async () => {
    setIsLoadingLeaveRecords(true);
    try {
      const data = await fetchLeaveRecordsFromSupabase();
      setLeaveRecords(data);
    } finally {
      setIsLoadingLeaveRecords(false);
    }
  }, []);

  const upsertLiveLeaveRecord = useCallback(
    async (leaveRecordData: LeaveEntry, successMessage = "Leave record saved successfully!") => {
      const toastId = showLoading(
        leaveRecordData.id ? "Updating leave record..." : "Saving leave record..."
      ) as string;
      setIsLoadingLeaveRecords(true);
      try {
        const saved = await upsertLeaveRecordToSupabase(leaveRecordData);
        if (saved) {
          setLeaveRecords((prev) => {
            const existingIndex = prev.findIndex((rec) => rec.id === saved.id);
            if (existingIndex !== -1) {
              return prev.map((rec, idx) => (idx === existingIndex ? saved : rec));
            }
            return [...prev, saved];
          });
          showSuccess(successMessage);
          return saved;
        }
        await fetchLiveLeaveRecords();
        return null;
      } catch (err) {
        console.error("useLeaveData: Unhandled error upserting live leave record:", err);
        showError("An unexpected error occurred while saving leave record data.");
        return null;
      } finally {
        dismissToast(toastId);
        setIsLoadingLeaveRecords(false);
      }
    },
    [fetchLiveLeaveRecords]
  );

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoadingLeaveRecords(true);
      return;
    }

    if (isMockDataEnabled) {
      setLeaveRecords(initialLeaveRecords);
      setIsLoadingLeaveRecords(false);
    } else if (isAuthenticated) {
      fetchLiveLeaveRecords();
    } else {
      setLeaveRecords([]);
      setIsLoadingLeaveRecords(false);
    }
  }, [isMockDataEnabled, isAuthenticated, isLoadingAuth, initialLeaveRecords, fetchLiveLeaveRecords]);

  useEffect(() => {
    if (leaveRecords.length > 0) {
      const leaveTypeMap = new Map<string, number>();
      leaveRecords.forEach((record) => {
        leaveTypeMap.set(record.leaveType, (leaveTypeMap.get(record.leaveType) || 0) + record.workingDays);
      });
      setLeaveTypeDistribution(Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value })));

      const monthlyLeaveMap = new Map<string, number>();
      leaveRecords.forEach((record) => {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        if (start <= end) {
          eachDayOfInterval({ start, end }).forEach((day) => {
            if (!isWeekend(day)) {
              const monthYear = format(day, "MMM yyyy");
              monthlyLeaveMap.set(monthYear, (monthlyLeaveMap.get(monthYear) || 0) + 1);
            }
          });
        }
      });

      setMonthlyLeaveData(
        Array.from(monthlyLeaveMap.entries())
          .map(([name, days]) => ({ name, days }))
          .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
      );
    } else {
      setLeaveTypeDistribution([]);
      setMonthlyLeaveData([]);
    }
  }, [leaveRecords]);

  const getEmployeeName = useCallback(
    (employeeId: string) => {
      const employee = employees.find((emp) => emp.id === employeeId);
      return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
    },
    [employees]
  );

  const getEmployeeCustomId = useCallback(
    (employeeId: string) => {
      const employee = employees.find((emp) => emp.id === employeeId);
      return employee ? employee.customEmployeeId : "N/A";
    },
    [employees]
  );

  const addLeaveRecord = useCallback(
    async (newRecord: Omit<LeaveEntry, "id">, options?: AddLeaveRecordOptions) => {
      const now = new Date().toISOString();
      const asStaffRequest = options?.asStaffRequest === true;

      const recordToAdd: LeaveEntry = {
        ...newRecord,
        id: uuidv4(),
        status: asStaffRequest ? "Pending" : newRecord.status || "Approved",
        source: asStaffRequest ? "staff" : newRecord.source || "admin",
        submittedAt: asStaffRequest ? now : newRecord.submittedAt,
        submittedByUserId: asStaffRequest ? user?.id : newRecord.submittedByUserId,
      };

      if (isMockDataEnabled) {
        setLeaveRecords((prevRecords) => {
          const updatedRecords = [...prevRecords, recordToAdd];
          persistMockLeaveRecords(updatedRecords);
          return updatedRecords;
        });
        showSuccess(asStaffRequest ? "Leave request submitted for approval." : "Leave record added successfully!");
        void recordAuditEvent({
          severity: asStaffRequest ? "info" : "change",
          module: "leave",
          action: asStaffRequest ? "leave_submitted" : "leave_recorded",
          message: asStaffRequest
            ? `Leave request submitted (${recordToAdd.leaveType})`
            : `Leave recorded (${recordToAdd.leaveType})`,
          entityType: "leave_record",
          entityId: recordToAdd.id,
          metadata: { status: recordToAdd.status, employeeId: recordToAdd.employeeId },
        });
        return recordToAdd;
      }

      await upsertLiveLeaveRecord(
        recordToAdd,
        asStaffRequest ? "Leave request submitted for approval." : "Leave record saved successfully!"
      );
      void recordAuditEvent({
        severity: asStaffRequest ? "info" : "change",
        module: "leave",
        action: asStaffRequest ? "leave_submitted" : "leave_recorded",
        message: asStaffRequest
          ? `Leave request submitted (${recordToAdd.leaveType})`
          : `Leave recorded (${recordToAdd.leaveType})`,
        entityType: "leave_record",
        entityId: recordToAdd.id,
        metadata: { status: recordToAdd.status, employeeId: recordToAdd.employeeId },
      });
      return recordToAdd;
    },
    [isMockDataEnabled, upsertLiveLeaveRecord, user?.id]
  );

  const updateLeaveRecord = useCallback(
    async (record: LeaveEntry) => {
      if (isMockDataEnabled) {
        setLeaveRecords((prev) => {
          const updated = prev.map((r) => (r.id === record.id ? record : r));
          persistMockLeaveRecords(updated);
          return updated;
        });
        showSuccess("Leave record updated.");
        void recordAuditEvent({
          severity: "change",
          module: "leave",
          action: "leave_updated",
          message: `Leave record updated (${record.leaveType})`,
          entityType: "leave_record",
          entityId: record.id,
          metadata: { status: record.status },
        });
        return record;
      }
      const saved = await upsertLiveLeaveRecord(record, "Leave record updated.");
      if (saved) {
        void recordAuditEvent({
          severity: "change",
          module: "leave",
          action: "leave_updated",
          message: `Leave record updated (${record.leaveType})`,
          entityType: "leave_record",
          entityId: record.id,
          metadata: { status: record.status },
        });
      }
      return saved;
    },
    [isMockDataEnabled, upsertLiveLeaveRecord]
  );

  const deleteLeaveRecord = useCallback(
    async (id: string) => {
      if (isMockDataEnabled) {
        setLeaveRecords((prev) => {
          const updated = prev.filter((r) => r.id !== id);
          persistMockLeaveRecords(updated);
          return updated;
        });
        showSuccess("Leave record deleted.");
        void recordAuditEvent({
          severity: "change",
          module: "leave",
          action: "leave_deleted",
          message: "Leave record deleted",
          entityType: "leave_record",
          entityId: id,
        });
        return true;
      }

      const toastId = showLoading("Deleting leave record...") as string;
      setIsLoadingLeaveRecords(true);
      try {
        const ok = await deleteLeaveRecordFromSupabase(id);
        if (ok) {
          setLeaveRecords((prev) => prev.filter((r) => r.id !== id));
          showSuccess("Leave record deleted.");
        }
        void recordAuditEvent({
          severity: "change",
          module: "leave",
          action: "leave_deleted",
          message: "Leave record deleted",
          entityType: "leave_record",
          entityId: id,
        });
        return ok;
      } finally {
        dismissToast(toastId);
        setIsLoadingLeaveRecords(false);
      }
    },
    [isMockDataEnabled]
  );

  const approveLeaveRecord = useCallback(
    async (id: string) => {
      const record = leaveRecords.find((r) => r.id === id);
      if (!record) return null;
      const updated: LeaveEntry = {
        ...record,
        status: "Approved",
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: user?.id,
        rejectionReason: undefined,
      };
      const result = await updateLeaveRecord(updated);
      void recordAuditEvent({
        severity: "change",
        module: "leave",
        action: "leave_approved",
        message: `Leave request approved (${record.leaveType})`,
        entityType: "leave_record",
        entityId: id,
      });
      return result;
    },
    [leaveRecords, updateLeaveRecord, user?.id]
  );

  const rejectLeaveRecord = useCallback(
    async (id: string, rejectionReason?: string) => {
      const record = leaveRecords.find((r) => r.id === id);
      if (!record) return null;
      const updated: LeaveEntry = {
        ...record,
        status: "Rejected",
        reviewedAt: new Date().toISOString(),
        reviewedByUserId: user?.id,
        rejectionReason: rejectionReason?.trim() || "Rejected by payroll.",
      };
      const result = await updateLeaveRecord(updated);
      void recordAuditEvent({
        severity: "warning",
        module: "leave",
        action: "leave_rejected",
        message: `Leave request rejected (${record.leaveType})`,
        entityType: "leave_record",
        entityId: id,
        metadata: { rejectionReason: updated.rejectionReason },
      });
      return result;
    },
    [leaveRecords, updateLeaveRecord, user?.id]
  );

  const cancelLeaveRequest = useCallback(
    async (id: string) => {
      const record = leaveRecords.find((r) => r.id === id);
      if (!record || record.status !== "Pending") return null;
      const updated: LeaveEntry = {
        ...record,
        status: "Cancelled",
      };
      const result = await updateLeaveRecord(updated);
      void recordAuditEvent({
        severity: "info",
        module: "leave",
        action: "leave_cancelled",
        message: "Leave request withdrawn by staff",
        entityType: "leave_record",
        entityId: id,
      });
      return result;
    },
    [leaveRecords, updateLeaveRecord]
  );

  return {
    leaveRecords,
    leaveTypeDistribution,
    monthlyLeaveData,
    getEmployeeName,
    getEmployeeCustomId,
    addLeaveRecord,
    updateLeaveRecord,
    deleteLeaveRecord,
    approveLeaveRecord,
    rejectLeaveRecord,
    cancelLeaveRequest,
    refetchLeaveRecords: fetchLiveLeaveRecords,
    isLoadingLeaveRecords,
  };
};
