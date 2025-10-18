// Define the expected input type for adding/updating timesheets
export interface TimesheetFormValues {
  employeeId: string;
  date: Date; // Expecting a Date object now
  timeIn: string;
  teaStart?: string;
  teaEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  timeOut: string;
}

// Define the expected input type for batch imports
export interface ImportableTimesheetEntry {
  employeeId: string;
  date: Date; // Expecting a Date object
  timeIn: string;
  teaStart?: string;
  teaEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  timeOut: string;
}