import { TimesheetEntry, MockEmployee } from "../mock-data-interfaces";
import { format, subDays, addHours, addMinutes, isBefore, isAfter, parseISO, parse } from "date-fns";

const calculateTimeDifferenceInHours = (start: string, end: string): number => {
  const startDate = parse(start, 'HH:mm', new Date());
  const endDate = parse(end, 'HH:mm', new Date());
  if (isBefore(endDate, startDate)) {
    // Handle cases where end time is on the next day (e.g., working past midnight)
    // For simplicity in mock, assume same day. If end is before start, it's an invalid entry or next day.
    // For now, return 0 or handle as error. Let's assume valid entries for mock.
    return 0; 
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

export const generateMockTimesheets = (employees: MockEmployee[]): TimesheetEntry[] => {
  const timesheets: TimesheetEntry[] = [];
  const today = new Date();

  employees.forEach(employee => {
    const standardDailyHours = employee.standardDailyHours || 8; // Default to 8 hours

    // Generate timesheets for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = subDays(today, i);
      const formattedDate = format(date, "yyyy-MM-dd");

      // Simulate a weekend day
      if (date.getDay() === 0 || date.getDay() === 6) { // Sunday or Saturday
        // No timesheet for weekends, or mark as absent
        continue; 
      }

      let timeIn = "08:00"; // Changed to let
      const teaStart = "10:00";
      const teaEnd = "10:15";
      const lunchStart = "13:00";
      const lunchEnd = "13:30";
      let timeOut = "17:00"; // Changed to let

      // Introduce some variations
      let totalWorkHours = 0;
      let overtimeHours = 0;
      let lateArrival = false;
      let earlyDeparture = false;
      let absent = false;
      
      // Determine status more dynamically to include "Approved"
      let status: TimesheetEntry["status"];
      if (i === 0) { // Today's entry
        status = "Approved";
      } else if (i === 1) { // Yesterday's entry
        status = "Submitted";
      } else if (employee.id === "EMP004" && i === 3) { // Sarah Brown was absent 3 days ago, keep as Draft
        status = "Draft";
      } else {
        status = "Submitted"; // Default for other days
      }

      // Simulate late arrival for some entries
      if (employee.id === "EMP001" && i === 2) { // John Doe was late 2 days ago
        timeIn = "08:15";
        lateArrival = true;
      }
      // Simulate early departure for some entries
      if (employee.id === "EMP002" && i === 4) { // Jane Smith left early 4 days ago
        timeOut = "16:30";
        earlyDeparture = true;
      }
      // Simulate overtime for some entries
      if (employee.id === "EMP003" && i === 1) { // Peter Jones worked overtime yesterday
        timeOut = "18:30";
      }
      // Simulate an absent day
      if (employee.id === "EMP004" && i === 3) { // Sarah Brown was absent 3 days ago
        absent = true;
        timeIn = ""; // Clear times
        timeOut = "";
      }

      if (!absent) {
        const totalShiftDuration = calculateTimeDifferenceInHours(timeIn, timeOut);
        const teaDuration = calculateTimeDifferenceInHours(teaStart, teaEnd);
        const lunchDuration = calculateTimeDifferenceInHours(lunchStart, lunchEnd);
        
        totalWorkHours = totalShiftDuration - teaDuration - lunchDuration;
        overtimeHours = Math.max(0, totalWorkHours - standardDailyHours);
      } else {
        totalWorkHours = 0;
        overtimeHours = 0;
      }

      const isSubmittedOrApproved = (status === "Submitted" || status === "Approved");
      const isApproved = (status === "Approved");

      timesheets.push({
        id: `TS-${employee.id}-${formattedDate}`,
        employeeId: employee.id,
        date: formattedDate,
        timeIn: timeIn,
        teaStart: teaStart,
        teaEnd: teaEnd,
        lunchStart: lunchStart,
        lunchEnd: lunchEnd,
        timeOut: timeOut,
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        lateArrival: lateArrival,
        earlyDeparture: earlyDeparture,
        absent: absent,
        status: status,
        submittedBy: isSubmittedOrApproved ? employee.firstName : undefined,
        submittedAt: isSubmittedOrApproved ? format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX") : undefined,
        approvedBy: isApproved ? "Admin User" : undefined,
        approvedAt: isApproved ? format(addHours(date, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX") : undefined,
        auditLog: [],
      });
    }
  });

  return timesheets;
};