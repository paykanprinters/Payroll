import { ToDoEntry, MockEmployee, MockPayslip, LeaveEntry, Loan, SavingPlan, TimesheetEntry } from "../mock-data-interfaces";
import { format, isSameMonth, isPast, subMonths, isBefore } from "date-fns";

export const generateMockToDos = (
  employees: MockEmployee[],
  payslips: MockPayslip[],
  leaveRecords: LeaveEntry[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  timesheets: TimesheetEntry[]
): ToDoEntry[] => {
  const toDos: ToDoEntry[] = [];
  const today = new Date();
  const currentMonth = format(today, 'yyyy-MM');
  const lastMonth = format(subMonths(today, 1), 'yyyy-MM');

  // --- Employees To-Dos ---
  const employeesMissingTax = employees.filter(emp => !emp.taxReferenceNumber);
  if (employeesMissingTax.length > 0) {
    toDos.push({
      id: `TODO-EMP-001`,
      message: `${employeesMissingTax.length} new hires missing tax numbers.`,
      level: "critical",
      module: "Employees",
      actionUrl: "/employees",
      status: "pending",
      assignedTo: "Admin",
    });
  }

  const employeesMissingPersonalId = employees.filter(emp => !emp.personalId);
  if (employeesMissingPersonalId.length > 0) {
    toDos.push({
      id: `TODO-EMP-002`,
      message: `${employeesMissingPersonalId.length} employees missing Personal ID for clock-in system.`,
      level: "warning",
      module: "Employees",
      actionUrl: "/employees",
      status: "pending",
      assignedTo: "Admin",
    });
  }

  // --- Timesheet To-Dos ---
  const incompleteTimesheets = timesheets.filter(ts =>
    ts.status === "Draft" && isPast(new Date(ts.date)) && !isSameMonth(new Date(ts.date), today)
  );
  if (incompleteTimesheets.length > 0) {
    toDos.push({
      id: `TODO-TS-001`,
      message: `${incompleteTimesheets.length} employees have incomplete timesheets for past periods.`,
      level: "critical",
      module: "Timesheet",
      actionUrl: "/timesheet",
      status: "pending",
      assignedTo: "HR",
    });
  }

  const unapprovedTimesheets = timesheets.filter(ts =>
    ts.status === "Submitted" && isPast(new Date(ts.date)) && !isSameMonth(new Date(ts.date), today)
  );
  if (unapprovedTimesheets.length > 0) {
    toDos.push({
      id: `TODO-TS-002`,
      message: `${unapprovedTimesheets.length} timesheets are submitted but not yet approved.`,
      level: "warning",
      module: "Timesheet",
      actionUrl: "/timesheet",
      status: "pending",
      assignedTo: "Admin",
    });
  }

  // --- Payslips To-Dos ---
  const employeesWithoutPayslipLastMonth = employees.filter(emp =>
    !payslips.some(p => p.employeeId === emp.id && p.payPeriod.startsWith(lastMonth))
  );
  if (employeesWithoutPayslipLastMonth.length > 0) {
    toDos.push({
      id: `TODO-PS-001`,
      message: `Payslips not generated for ${employeesWithoutPayslipLastMonth.length} employees for ${format(subMonths(today, 1), 'MMMM yyyy')}.`,
      level: "critical",
      module: "Payslips",
      actionUrl: "/payslips/overview",
      status: "pending",
      assignedTo: "Finance",
    });
  }

  // --- Loans & Advancements To-Dos ---
  const pendingLoanRequests = loans.filter(loan => loan.status === "active" && isBefore(new Date(loan.startDate), today)); // Simplified: active loans started in past
  if (pendingLoanRequests.length > 0) {
    toDos.push({
      id: `TODO-LOAN-001`,
      message: `${pendingLoanRequests.length} loan requests pending approval or review.`,
      level: "warning",
      module: "Loans & Advancements",
      actionUrl: "/loans-advancements",
      status: "pending",
      assignedTo: "Finance",
    });
  }

  // --- Savings To-Dos ---
  const activeSavingPlans = savingPlans.filter(plan => plan.status === "active");
  if (activeSavingPlans.length > 0 && activeSavingPlans.length % 2 !== 0) { // Mock: odd number of active plans needs review
    toDos.push({
      id: `TODO-SAV-001`,
      message: `Review ${activeSavingPlans.length} active savings plans for consistency.`,
      level: "info",
      module: "Savings",
      actionUrl: "/savings",
      status: "pending",
      assignedTo: "HR",
    });
  }

  // --- Vacation & Absence To-Dos ---
  const overlappingLeaveRequests = leaveRecords.filter(rec => {
    const leaveStart = new Date(rec.startDate);
    const leaveEnd = new Date(rec.endDate);
    // Mock: check if leave overlaps with a fixed payroll run date (e.g., 25th of current month)
    const payrollRunDate = new Date(today.getFullYear(), today.getMonth(), 25);
    return isWithinInterval(payrollRunDate, { start: leaveStart, end: leaveEnd });
  });
  if (overlappingLeaveRequests.length > 0) {
    toDos.push({
      id: `TODO-VAC-001`,
      message: `${overlappingLeaveRequests.length} leave requests overlap with upcoming payroll run.`,
      level: "critical",
      module: "Vacation & Absence",
      actionUrl: "/vacation-absence",
      status: "pending",
      assignedTo: "HR",
    });
  }

  // --- Reports To-Dos ---
  // Mock: EMP201 not submitted for last month (assuming it should be generated monthly)
  const emp201SubmittedLastMonth = payslips.some(p => p.payPeriod.startsWith(lastMonth));
  if (!emp201SubmittedLastMonth) {
    toDos.push({
      id: `TODO-REP-001`,
      message: `EMP201 (Tax & Statutory Report) not generated for ${format(subMonths(today, 1), 'MMMM yyyy')}.`,
      level: "critical",
      module: "Reports",
      actionUrl: "/reports",
      status: "pending",
      assignedTo: "Finance",
    });
  }

  return toDos;
};