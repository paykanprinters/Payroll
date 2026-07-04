import { ToDoEntry, MockEmployee, MockPayslip, Loan, SavingPlan, LeaveEntry, TimesheetEntry } from "../mock-data-interfaces";
import { format, isPast, subMonths, isWithinInterval, parseISO } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

// Define fields to check for incompleteness and generate To-Dos
// IMPORTANT: These keys must match the camelCase property names in the MockEmployee interface
const fieldsToFlag = [
  { key: "personalId", label: "Personal ID (Clock-in)", level: "critical" },
  { key: "idNumber", label: "National ID Number", level: "critical" },
  { key: "phoneNumber", label: "Mobile Number", level: "warning" },
  { key: "taxReferenceNumber", label: "Tax Reference Number", level: "critical" },
  { key: "accountNumber", label: "Bank Account Number", level: "critical" },
];

export const generateMockToDos = (
  employees: MockEmployee[],
  payslips: MockPayslip[],
  leaveRecords: LeaveEntry[],
  loans: Loan[],
  savingPlans: SavingPlan[],
  timesheets: TimesheetEntry[]
): ToDoEntry[] => {
  const mockToDos: ToDoEntry[] = [];
  const today = new Date();
  const currentMonth = format(today, 'yyyy-MM');
  const lastMonth = format(subMonths(today, 1), 'yyyy-MM');

  // --- Employee Profile Incompleteness To-Dos ---
  employees.forEach(employee => {
    fieldsToFlag.forEach(field => {
      const fieldValue = (employee as any)[field.key]; // Access dynamically
      const ignoredFields = employee.ignoredIncompleteFields || [];
      const isIgnored = ignoredFields.includes(field.key);

      if ((fieldValue === null || fieldValue === undefined || fieldValue === '') && !isIgnored) {
        mockToDos.push({
          id: uuidv4(),
          message: `Employee ${employee.firstName} ${employee.lastName} is missing ${field.label}.`,
          level: field.level as ToDoEntry["level"],
          module: "Employees",
          actionUrl: "/employees",
          status: "pending",
          assignedTo: "HR",
          employeeId: employee.id,
          relatedField: field.key,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  });

  // --- Timesheet To-Dos ---
  const incompleteTimesheets = timesheets.filter(ts =>
    ts.status === "Draft" && isPast(parseISO(ts.date)) && !format(parseISO(ts.date), 'yyyy-MM').startsWith(currentMonth)
  );
  if (incompleteTimesheets.length > 0) {
    mockToDos.push({
      id: uuidv4(),
      message: `${incompleteTimesheets.length} employees have incomplete timesheets for past periods.`,
      level: "critical",
      module: "Timesheet",
      actionUrl: "/timesheet",
      status: "pending",
      assignedTo: "HR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const unapprovedTimesheets = timesheets.filter(ts =>
    ts.status === "Submitted" && isPast(parseISO(ts.date)) && !format(parseISO(ts.date), 'yyyy-MM').startsWith(currentMonth)
  );
  if (unapprovedTimesheets.length > 0) {
    mockToDos.push({
      id: uuidv4(),
      message: `${unapprovedTimesheets.length} timesheets are submitted but not yet approved.`,
      level: "warning",
      module: "Timesheet",
      actionUrl: "/timesheet",
      status: "pending",
      assignedTo: "Admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Payslips To-Dos ---
  const employeesWithoutPayslipLastMonth = employees.filter(emp =>
    !payslips.some(p => p.employeeId === emp.id && p.payPeriod.startsWith(lastMonth))
  );
  if (employeesWithoutPayslipLastMonth.length > 0) {
    mockToDos.push({
      id: uuidv4(),
      message: `Payslips not generated for ${employeesWithoutPayslipLastMonth.length} employees for ${format(subMonths(today, 1), 'MMMM yyyy')}.`,
      level: "critical",
      module: "Payslips",
      actionUrl: "/payslips/overview",
      status: "pending",
      assignedTo: "Finance",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Loans & Advancements To-Dos ---
  // Loans are admin-created (active | completed only). There is no employee
  // application / approval workflow, so do not invent "pending approval" items.
  // Paused deductions are the only loan state that still needs attention.
  const pausedLoans = loans.filter(loan => loan.paused);
  if (pausedLoans.length > 0) {
    mockToDos.push({
      id: uuidv4(),
      message: `${pausedLoans.length} loans are currently paused and require review.`,
      level: "warning",
      module: "Loans & Advancements",
      actionUrl: "/loans-advancements",
      status: "pending",
      assignedTo: "Finance",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Savings To-Dos ---
  const activeSavingPlans = savingPlans.filter(plan => plan.status === "active");
  if (activeSavingPlans.length > 0 && activeSavingPlans.length % 2 !== 0) {
    mockToDos.push({
      id: uuidv4(),
      message: `Review ${activeSavingPlans.length} active savings plans for consistency.`,
      level: "info",
      module: "Savings",
      actionUrl: "/savings",
      status: "pending",
      assignedTo: "HR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Vacation & Absence To-Dos ---
  const overlappingLeaveRequests = leaveRecords.filter(rec => {
    const leaveStart = parseISO(rec.startDate);
    const leaveEnd = parseISO(rec.endDate);
    const payrollRunDate = new Date(today.getFullYear(), today.getMonth(), 25);
    return isWithinInterval(payrollRunDate, { start: leaveStart, end: leaveEnd });
  });
  if (overlappingLeaveRequests.length > 0) {
    mockToDos.push({
      id: uuidv4(),
      message: `${overlappingLeaveRequests.length} leave requests overlap with upcoming payroll run.`,
      level: "critical",
      module: "Vacation & Absence",
      actionUrl: "/vacation-absence",
      status: "pending",
      assignedTo: "HR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // --- Reports To-Dos ---
  const emp201SubmittedLastMonth = payslips.some(p => p.payPeriod.startsWith(lastMonth));
  if (!emp201SubmittedLastMonth) {
    mockToDos.push({
      id: uuidv4(),
      message: `EMP201 (Tax & Statutory Report) not generated for ${format(subMonths(today, 1), 'MMMM yyyy')}.`,
      level: "critical",
      module: "Reports",
      actionUrl: "/reports",
      status: "pending",
      assignedTo: "Finance",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return mockToDos;
};