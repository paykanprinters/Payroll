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
  let classes = "";
  switch (layoutSize) {
    case "Letter":
      classes = "w-letter min-h-letter p-6 text-sm";
      break;
    case "A5":
      classes = "w-a5 min-h-a5 p-4 text-xs";
      break;
    case "A4":
    default:
      classes = "w-a4 min-h-a4 p-8 text-base";
      break;
  }
  // If it's for PDF generation, return classes directly. Otherwise, prefix with 'print:'
  return isPdfGeneration ? classes : classes.split(' ').map(cls => `print:${cls}`).join(' ');
};