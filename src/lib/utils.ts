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
export const getPrintClasses = (layoutSize: "Letter" | "A4" | "A5" | undefined, isPdfGeneration: boolean = false) => {
  const prefix = isPdfGeneration ? "" : "print:"; // Apply 'print:' prefix only if not PDF generation
  switch (layoutSize) {
    case "Letter":
      return `${prefix}w-letter ${prefix}min-h-letter ${prefix}p-6 ${prefix}text-sm`;
    case "A5":
      return `${prefix}w-a5 ${prefix}min-h-a5 ${prefix}p-4 ${prefix}text-xs`;
    case "A4":
    default:
      return `${prefix}w-a4 ${prefix}min-h-a4 ${prefix}p-8 ${prefix}text-base`;
  }
};