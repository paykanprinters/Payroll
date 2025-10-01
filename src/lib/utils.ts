import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee } from "./mock-data"; // Import MockEmployee for type safety

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

// Helper to get employee name
export const getEmployeeName = (employeeId: string, employees: MockEmployee[]) => {
  const employee = employees.find(emp => emp.id === employeeId);
  return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
};