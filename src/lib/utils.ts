import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MockEmployee } from "./mock-data-interfaces";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to get employee name
export const getEmployeeName = (employeeId: string, employees: MockEmployee[]) => {
  const employee = employees.find(emp => emp.id === employeeId);
  return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
};

// Helper to get explicit print styles for different paper sizes
export const getPrintStyles = (layoutSize: "Letter" | "A4" | "A5" | undefined): React.CSSProperties => {
  let styles: React.CSSProperties = {};

  // Define base font size based on paper size. Padding will be handled by individual components.
  switch (layoutSize) {
    case "Letter":
      styles = {
        ...styles,
        fontSize: '13px', // Base font size for Letter
      };
      break;
    case "A5":
      styles = {
        ...styles,
        fontSize: '11px', // Smaller base font size for A5
      };
      break;
    case "A4":
    default:
      styles = {
        ...styles,
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

// Helper to generate custom employee ID
export const generateCustomEmployeeId = (companyName: string, currentMaxNumber: number): string => {
  const prefix = companyName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || "CMP";
  const nextNumber = currentMaxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}${paddedNumber}`;
};

export const bankersRound = (value: number, decimals: number = 2): number => {
  if (!isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;
  const epsilon = 1e-8;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (Math.abs(diff - 0.5) <= epsilon) {
    const even = floor % 2 === 0 ? floor : floor + 1;
    return even / factor;
  }
  return Math.round(scaled) / factor;
};

// NEW: Format currency string with bankers rounding first
export const formatCurrency = (value: number, locale: string = 'en-ZA'): string => {
  return bankersRound(value, 2).toLocaleString(locale, { minimumFractionDigits: 2 });
};