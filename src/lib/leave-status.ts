import type { LeaveEntry } from "@/lib/mock-data-interfaces";

export const LEAVE_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export const LEAVE_SOURCES = ["admin", "staff"] as const;
export type LeaveSource = (typeof LEAVE_SOURCES)[number];

/** Staff can request these types; admins may record any type. */
export const STAFF_REQUESTABLE_LEAVE_TYPES: LeaveEntry["leaveType"][] = [
  "Annual Leave",
  "Sick Leave",
  "Family Responsibility Leave",
  "Maternity Leave",
];

export function normalizeLeaveStatus(status?: LeaveStatus | string | null): LeaveStatus {
  if (status && LEAVE_STATUSES.includes(status as LeaveStatus)) {
    return status as LeaveStatus;
  }
  return "Approved";
}

export function isApprovedLeave(record: Pick<LeaveEntry, "status">): boolean {
  return normalizeLeaveStatus(record.status) === "Approved";
}

export function isPendingLeave(record: Pick<LeaveEntry, "status">): boolean {
  return normalizeLeaveStatus(record.status) === "Pending";
}

export function isLeaveEffectiveForPayroll(record: Pick<LeaveEntry, "status">): boolean {
  return isApprovedLeave(record);
}

export function leaveStatusLabel(status?: LeaveStatus | string | null): string {
  return normalizeLeaveStatus(status);
}

export function leaveStatusBadgeVariant(
  status?: LeaveStatus | string | null
): "default" | "secondary" | "destructive" | "outline" {
  switch (normalizeLeaveStatus(status)) {
    case "Approved":
      return "default";
    case "Pending":
      return "secondary";
    case "Rejected":
      return "destructive";
    case "Cancelled":
      return "outline";
    default:
      return "outline";
  }
}

export function canStaffEditLeave(record: LeaveEntry): boolean {
  return isPendingLeave(record) && record.source === "staff";
}

export function canStaffCancelLeave(record: LeaveEntry): boolean {
  return canStaffEditLeave(record);
}
