import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee } from "./mock-data-interfaces"; // Updated import

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

// Helper to get print-specific classes for different paper sizes
export const getPrintClasses = (layoutSize: "Letter" | "A4" | "A5" | undefined) => {
  switch (layoutSize) {
    case "Letter":
      return "print:w-letter print:min-h-letter print:p-6 print:text-sm";
    case "A5":
      return "print:w-a5 print:min-h-a5 print:p-4 print:text-xs";
    case "A4":
    default:
      return "print:w-a4 print:min-h-a4 print:p-8 print:text-base";
  }
};