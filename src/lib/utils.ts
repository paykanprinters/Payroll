import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { eachDayOfInterval, isWeekend } from "date-fns";
import { MockEmployee } from "./mock-data-interfaces";

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

// Helper to get explicit print styles for different paper sizes
export const getPrintStyles = (layoutSize: "Letter" | "A4" | "A5" | undefined): React.CSSProperties => {
  let styles: React.CSSProperties = {
    // Removed default border here, it's now handled by injected CSS
    boxShadow: 'none', // Ensure no shadow in print/PDF
  };
  // Define internal padding and base font size based on paper size
  // The overall page dimensions and margins will be controlled by html2pdf.js's format and margin options.
  switch (layoutSize) {
    case "Letter":
      styles = {
        ...styles, // Keep the border and boxShadow
        padding: '24px', // Approx 0.25 inch margin
        fontSize: '13px', // Base font size for Letter
      };
      break;
    case "A5":
      styles = {
        ...styles,
        padding: '16px', // Smaller padding for A5
        fontSize: '11px', // Smaller base font size for A5
      };
      break;
    case "A4":
    default:
      styles = {
        ...styles,
        padding: '32px', // Standard padding for A4
        fontSize: '14px', // Base font size for A4
      };
      break;
  }
  return styles;
};

// getPrintClasses is no longer needed as getPrintStyles provides explicit CSS.
// Keeping it commented out for reference if needed for non-PDF print media queries.
/*
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
  return isPdfGeneration ? classes : classes.split(' ').map(cls => `print:${cls}`).join(' ');
};
*/