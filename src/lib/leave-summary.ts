import { eachDayOfInterval, isWeekend, isWithinInterval, parseISO } from "date-fns";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import { isLeaveEffectiveForPayroll } from "@/lib/leave-status";
import { computeEmployeeLeaveBalance } from "@/lib/leave-accrual";

export function countUnpaidLeaveDays(
  emp: MockEmployee,
  leaveRecords: LeaveEntry[],
  periodStart: Date,
  periodEnd: Date
): number {
  let days = 0;
  leaveRecords
    .filter((rec) => rec.employeeId === emp.id && rec.leaveType === "Unpaid Leave" && isLeaveEffectiveForPayroll(rec))
    .forEach((rec) => {
      const leaveStart = new Date(rec.startDate);
      const leaveEnd = new Date(rec.endDate);
      if (
        !isWithinInterval(leaveStart, { start: periodStart, end: periodEnd }) &&
        !isWithinInterval(leaveEnd, { start: periodStart, end: periodEnd }) &&
        !(leaveStart < periodStart && leaveEnd > periodEnd)
      ) {
        return;
      }
      const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
      const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
      days += eachDayOfInterval({ start: overlapStart, end: overlapEnd }).filter(
        (d) => !isWeekend(d)
      ).length;
    });
  return days;
}

export function calculateLeaveSummary(
  emp: MockEmployee,
  leaveRecords: LeaveEntry[],
  periodStart: Date,
  periodEnd: Date,
  unpaidLeaveDaysInPeriod: number
): { annual: number; sick: number; unpaid: number; family?: number } {
  const snapshot = computeEmployeeLeaveBalance(emp, leaveRecords, periodEnd);

  return {
    annual: snapshot.annual.remaining,
    sick: snapshot.sick.remaining,
    unpaid: unpaidLeaveDaysInPeriod,
    family: snapshot.familyResponsibility.remaining,
  };
}
