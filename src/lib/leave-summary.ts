import { eachDayOfInterval, isWeekend, isWithinInterval, parseISO } from "date-fns";
import { MockEmployee, LeaveEntry } from "@/lib/mock-data-interfaces";
import { isLeaveEffectiveForPayroll } from "@/lib/leave-status";

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
): { annual: number; sick: number; unpaid: number } {
  let annualLeaveTaken = 0;
  let sickLeaveTaken = 0;

  leaveRecords
    .filter((rec) => rec.employeeId === emp.id && isLeaveEffectiveForPayroll(rec))
    .forEach((rec) => {
      const leaveStart = parseISO(rec.startDate);
      const leaveEnd = parseISO(rec.endDate);
      if (
        !isWithinInterval(leaveStart, { start: periodStart, end: periodEnd }) &&
        !isWithinInterval(leaveEnd, { start: periodStart, end: periodEnd }) &&
        !(leaveStart < periodStart && leaveEnd > periodEnd)
      ) {
        return;
      }
      const overlapStart = leaveStart > periodStart ? leaveStart : periodStart;
      const overlapEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;
      const daysInOverlap = eachDayOfInterval({ start: overlapStart, end: overlapEnd }).filter(
        (d) => !isWeekend(d)
      ).length;

      if (rec.leaveType === "Annual Leave") annualLeaveTaken += daysInOverlap;
      else if (rec.leaveType === "Sick Leave") sickLeaveTaken += daysInOverlap;
    });

  const mockAnnualLeaveBalance = 20;
  const mockSickLeaveBalance = 10;

  return {
    annual: mockAnnualLeaveBalance - annualLeaveTaken,
    sick: mockSickLeaveBalance - sickLeaveTaken,
    unpaid: unpaidLeaveDaysInPeriod,
  };
}
