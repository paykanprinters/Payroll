import { TimesheetEntry, MockEmployee } from "../mock-data-interfaces";
import { format, subDays, addDays, addHours, addMinutes, isBefore, isAfter, parseISO, parse, subMonths, addMonths } from "date-fns";
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const calculateTimeDifferenceInHours = (start: string, end: string): number => {
  const startDate = parse(start, 'HH:mm', new Date());
  const endDate = parse(end, 'HH:mm', new Date());
  if (isBefore(endDate, startDate)) {
    endDate.setDate(endDate.getDate() + 1); // Assume it spans midnight
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
};

export const generateMockTimesheets = (employees: MockEmployee[]): TimesheetEntry[] => {
  const timesheets: TimesheetEntry[] = [];
  const today = new Date();

  // Generate timesheets for a wider range: 6 months in the past to 6 months in the future
  const startDateRange = subMonths(today, 6);
  const endDateRange = addMonths(today, 6);

  employees.forEach(employee => {
    const standardDailyHours = employee.standardDailyHours || 8; // Default to 8 hours

    let currentDate = startDateRange;
    while (currentDate <= endDateRange) {
      const formattedDate = format(currentDate, "yyyy-MM-dd");

      // Skip weekends for most entries, but add some "absent" entries for variety
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) { // Sunday or Saturday
        currentDate = addDays(currentDate, 1);
        continue;
      }

      let timeIn = "08:00";
      const teaStart = "10:00";
      const teaEnd = "10:15";
      const lunchStart = "13:00";
      const lunchEnd = "13:30";
      let timeOut = "17:00";

      let totalWorkHours = 0;
      let overtimeHours = 0;
      let lateArrival = false;
      let earlyDeparture = false;
      let absent = false;

      // Simulate different statuses and scenarios across the date range
      let status: TimesheetEntry["status"] = "Approved"; // Default to Approved for broader coverage
      let submittedBy: string | undefined = "System (Mock)";
      let submittedAt: string | undefined = format(currentDate, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      let approvedBy: string | undefined = "Admin User";
      let approvedAt: string | undefined = format(addHours(currentDate, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      let captureMethod: "Manual" | "Biometric" | "Imported" = "Biometric"; // Default to biometric for realism

      // Introduce some variations for specific employees or dates
      if (employee.id === "EMP001" && currentDate.getDate() % 5 === 0) { // John Doe: some manual entries
        captureMethod = "Manual";
        status = "Submitted";
        approvedBy = undefined;
        approvedAt = undefined;
      }
      if (employee.id === "EMP002" && currentDate.getDate() % 7 === 0) { // Jane Smith: some imported entries
        captureMethod = "Imported";
        status = "Approved";
      }
      if (employee.id === "EMP004" && currentDate.getDate() % 10 === 0) { // Sarah Brown: some absent days
        absent = true;
        timeIn = "";
        timeOut = "";
        status = "Draft";
        submittedBy = undefined;
        submittedAt = undefined;
        approvedBy = undefined;
        approvedAt = undefined;
      }
      if (employee.id === "EMP003" && currentDate.getDate() % 3 === 0) { // Peter Jones: some overtime
        timeOut = "18:30";
      }
      if (employee.id === "EMP005" && currentDate.getDate() % 4 === 0) { // David Green: some late arrivals
        timeIn = "08:30";
        lateArrival = true;
      }

      if (!absent) {
        const totalShiftDuration = calculateTimeDifferenceInHours(timeIn, timeOut);
        const teaDuration = calculateTimeDifferenceInHours(teaStart, teaEnd);
        const lunchDuration = calculateTimeDifferenceInHours(lunchStart, lunchEnd);
        
        totalWorkHours = totalShiftDuration - teaDuration - lunchDuration;
        overtimeHours = Math.max(0, totalWorkHours - standardDailyHours);

        // Late Arrival / Early Departure (simplified logic)
        const expectedTimeIn = parse("08:00", 'HH:mm', new Date()); // Adjusted expected time in
        const actualTimeIn = parse(timeIn, 'HH:mm', new Date());
        if (isAfter(actualTimeIn, expectedTimeIn)) {
          lateArrival = true;
        }

        const expectedTimeOut = parse("17:00", 'HH:mm', new Date());
        const actualTimeOut = parse(timeOut, 'HH:mm', new Date());
        if (isBefore(actualTimeOut, expectedTimeOut)) {
          earlyDeparture = true;
        }

      } else {
        totalWorkHours = 0;
        overtimeHours = 0;
      }

      timesheets.push({
        id: uuidv4(), // Use uuidv4 for unique IDs
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
        submittedBy: submittedBy,
        submittedAt: submittedAt,
        approvedBy: approvedBy,
        approvedAt: approvedAt,
        auditLog: [{ action: "Created", timestamp: new Date().toISOString(), user: "System (Mock)", captureMethod: captureMethod }],
      });

      currentDate = addDays(currentDate, 1);
    }
  });

  return timesheets;
};