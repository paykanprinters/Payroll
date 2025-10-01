import { LeaveEntry } from "../mock-data-interfaces";

export const generateMockLeaveRecords = (): LeaveEntry[] => [
  {
    id: "LEAVE001",
    employeeId: "EMP001",
    leaveType: "Annual Leave",
    startDate: "2024-08-05",
    endDate: "2024-08-09",
    totalDays: 5,
    workingDays: 5,
    reason: "Summer vacation",
    documentUrl: undefined,
  },
  {
    id: "LEAVE002",
    employeeId: "EMP002",
    leaveType: "Sick Leave",
    startDate: "2024-07-22",
    endDate: "2024-07-23",
    totalDays: 2,
    workingDays: 2,
    reason: "Flu",
    documentUrl: "data:application/pdf;base64,JVBERi0xLjQKJcOvxo... (mock base64 PDF)", // Mock document
  },
];