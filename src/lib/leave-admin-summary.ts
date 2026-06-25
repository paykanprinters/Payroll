import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { LeaveEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { normalizeLeaveStatus } from "@/lib/leave-status";

export interface LeaveAdminSummary {
  total: number;
  workingDays: number;
  annualDays: number;
  sickDays: number;
  unpaidDays: number;
  pendingCount: number;
  uniqueEmployees: number;
  leaveTypeDistribution: { name: string; value: number }[];
  monthlyLeaveData: { name: string; days: number }[];
}

export interface LeaveRecordFilters {
  employeeId: string;
  leaveType: string;
  status: string;
  dateStart: string;
  dateEnd: string;
  search: string;
}

const ALL_LEAVE_TYPES: LeaveEntry["leaveType"][] = [
  "Annual Leave",
  "Sick Leave",
  "Unpaid Leave",
  "Family Responsibility Leave",
  "Maternity Leave",
];

function buildMonthlyLeaveData(records: LeaveEntry[]): { name: string; days: number }[] {
  const monthlyLeaveMap = new Map<string, number>();

  records.forEach((record) => {
    const start = new Date(record.startDate);
    const end = new Date(record.endDate);
    if (start > end) return;

    eachDayOfInterval({ start, end }).forEach((day) => {
      if (!isWeekend(day)) {
        const monthYear = format(day, "MMM yyyy");
        monthlyLeaveMap.set(monthYear, (monthlyLeaveMap.get(monthYear) || 0) + 1);
      }
    });
  });

  return Array.from(monthlyLeaveMap.entries())
    .map(([name, days]) => ({ name, days }))
    .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
}

export function buildLeaveAdminSummary(records: LeaveEntry[]): LeaveAdminSummary {
  const leaveTypeMap = new Map<string, number>();
  const employeeIds = new Set<string>();
  let workingDays = 0;
  let annualDays = 0;
  let sickDays = 0;
  let unpaidDays = 0;
  let pendingCount = 0;

  records.forEach((record) => {
    employeeIds.add(record.employeeId);
    if (normalizeLeaveStatus(record.status) === "Pending") pendingCount += 1;
    const days = record.workingDays || 0;
    workingDays += days;
    leaveTypeMap.set(record.leaveType, (leaveTypeMap.get(record.leaveType) || 0) + days);

    if (record.leaveType === "Annual Leave") annualDays += days;
    else if (record.leaveType === "Sick Leave") sickDays += days;
    else if (record.leaveType === "Unpaid Leave") unpaidDays += days;
  });

  return {
    total: records.length,
    workingDays,
    annualDays,
    sickDays,
    unpaidDays,
    pendingCount,
    uniqueEmployees: employeeIds.size,
    leaveTypeDistribution: Array.from(leaveTypeMap.entries()).map(([name, value]) => ({ name, value })),
    monthlyLeaveData: buildMonthlyLeaveData(records),
  };
}

export function filterLeaveRecords(
  records: LeaveEntry[],
  employees: MockEmployee[],
  filters: LeaveRecordFilters
): LeaveEntry[] {
  const term = filters.search.trim().toLowerCase();

  const employeeById = new Map(employees.map((e) => [e.id, e]));

  return records.filter((record) => {
    if (filters.employeeId !== "all" && record.employeeId !== filters.employeeId) return false;
    if (filters.leaveType !== "all" && record.leaveType !== filters.leaveType) return false;
    if (filters.status !== "all" && normalizeLeaveStatus(record.status) !== filters.status) return false;

    if (filters.dateStart && record.endDate < filters.dateStart) return false;
    if (filters.dateEnd && record.startDate > filters.dateEnd) return false;

    if (term.length > 0) {
      const emp = employeeById.get(record.employeeId);
      const haystack = [
        emp ? `${emp.firstName} ${emp.lastName}` : "",
        emp?.customEmployeeId || "",
        record.leaveType,
        record.reason || "",
        normalizeLeaveStatus(record.status),
        record.startDate,
        record.endDate,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });
}

export { ALL_LEAVE_TYPES };
