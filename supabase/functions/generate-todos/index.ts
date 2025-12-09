import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, isPast, subMonths, isBefore, isWithinInterval, parseISO } from "https://esm.sh/date-fns@2.30.0";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Define fields to check for incompleteness and generate To-Dos
// IMPORTANT: These keys must match the snake_case column names in the Supabase 'employees' table
const fieldsToFlag = [
  { key: "personal_id", label: "Personal ID (Clock-in)", level: "critical" },
  { key: "phone_number", label: "Mobile Number", level: "warning" },
];

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!origin || origin !== allowedOrigin) {
    return new Response("Forbidden origin", { status: 403, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: requestingUserProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || requestingUserProfile?.role !== 'Admin') {
      return new Response('Forbidden: Only Admins can generate To-Dos.', { status: 403, headers: corsHeaders });
    }

    // Fetch all necessary data from Supabase
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, personal_id, phone_number, ignored_incomplete_fields');
    if (employeesError) throw employeesError;

    const { data: payslips, error: payslipsError } = await supabaseAdmin
      .from('payslips')
      .select('employee_id, pay_period');
    if (payslipsError) throw payslipsError;

    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('id, employee_id, paused, start_date, status');
    if (loansError) throw loansError;

    const { data: savingPlans, error: savingPlansError } = await supabaseAdmin
      .from('saving_plans')
      .select('id, employee_id, status');
    if (savingPlansError) throw savingPlansError;

    const { data: leaveRecords, error: leaveRecordsError } = await supabaseAdmin
      .from('leave_records')
      .select('id, employee_id, start_date, end_date');
    if (leaveRecordsError) throw leaveRecordsError;

    const { data: timesheets, error: timesheetsError } = await supabaseAdmin
      .from('timesheets')
      .select('id, employee_id, date, status');
    if (timesheetsError) throw timesheetsError;

    const { data: existingToDos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('id, employee_id, related_field, message, status')
      .eq('status', 'pending');
    if (todosError) throw todosError;

    const newToDosToInsert: any[] = [];
    const toDosToUpdateToDone: string[] = [];
    const existingToDoMap = new Map<string, string>(); // Key: employee_id-related_field or message, Value: todo_id

    existingToDos.forEach((todo: any) => {
      if (todo.employee_id && todo.related_field) {
        existingToDoMap.set(`${todo.employee_id}-${todo.related_field}`, todo.id);
      } else {
        existingToDoMap.set(todo.message, todo.id);
      }
    });

    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const lastMonth = format(subMonths(today, 1), 'yyyy-MM');

    // --- Employee Profile Incompleteness To-Dos ---
    for (const employee of employees) {
      for (const field of fieldsToFlag) {
        const fieldValue = (employee as any)[field.key];
        const ignoredFields = Array.isArray(employee.ignored_incomplete_fields) ? employee.ignored_incomplete_fields : [];
        const isIgnored = ignoredFields.includes(field.key);
        const todoKey = `${employee.id}-${field.key}`;
        const existingToDoId = existingToDoMap.get(todoKey);

        const isFieldMissingAndNotIgnored = (fieldValue === null || fieldValue === '') && !isIgnored;

        if (isFieldMissingAndNotIgnored) {
          if (!existingToDoId) {
            newToDosToInsert.push({
              message: `Employee ${employee.first_name} ${employee.last_name} is missing ${field.label}.`,
              level: field.level,
              module: "Employees",
              action_url: "/employees",
              status: "pending",
              assigned_to: "HR",
              employee_id: employee.id,
              related_field: field.key,
            });
          }
        } else if (!isFieldMissingAndNotIgnored && existingToDoId) {
          toDosToUpdateToDone.push(existingToDoId);
        }
      }
    }

    // --- Timesheet To-Dos ---
    const incompleteTimesheets = timesheets.filter((ts: any) =>
      ts.status === "Draft" && isPast(parseISO(ts.date)) && !format(parseISO(ts.date), 'yyyy-MM').startsWith(currentMonth)
    );
    const incompleteTimesheetsMessage = `${incompleteTimesheets.length} employees have incomplete timesheets for past periods.`;
    if (incompleteTimesheets.length > 0) {
      if (!existingToDoMap.has(incompleteTimesheetsMessage)) {
        newToDosToInsert.push({
          message: incompleteTimesheetsMessage,
          level: "critical",
          module: "Timesheet",
          action_url: "/timesheet",
          status: "pending",
          assigned_to: "HR",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(incompleteTimesheetsMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    const unapprovedTimesheets: any[] = timesheets.filter((ts: any) =>
      ts.status === "Submitted" && isPast(parseISO(ts.date)) && !format(parseISO(ts.date), 'yyyy-MM').startsWith(currentMonth)
    );
    const unapprovedTimesheetsMessage = `${unapprovedTimesheets.length} timesheets are submitted but not yet approved.`;
    if (unapprovedTimesheets.length > 0) {
      if (!existingToDoMap.has(unapprovedTimesheetsMessage)) {
        newToDosToInsert.push({
          message: unapprovedTimesheetsMessage,
          level: "warning",
          module: "Timesheet",
          action_url: "/timesheet",
          status: "pending",
          assigned_to: "Admin",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(unapprovedTimesheetsMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    // --- Payslips To-Dos ---
    const employeesWithoutPayslipLastMonth = employees.filter((emp: any) =>
      !payslips.some((p: any) => p.employee_id === emp.id && p.pay_period.startsWith(lastMonth))
    );
    const payslipMissingMessage = `Payslips not generated for ${employeesWithoutPayslipLastMonth.length} employees for ${format(subMonths(today, 1), 'MMMM yyyy')}.`;
    if (employeesWithoutPayslipLastMonth.length > 0) {
      if (!existingToDoMap.has(payslipMissingMessage)) {
        newToDosToInsert.push({
          message: payslipMissingMessage,
          level: "critical",
          module: "Payslips",
          action_url: "/payslips/overview",
          status: "pending",
          assigned_to: "Finance",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(payslipMissingMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    // --- Loans & Advancements To-Dos ---
    const pausedLoans = loans.filter((loan: any) => loan.paused);
    const pausedLoansMessage = `${pausedLoans.length} loans are currently paused and require review.`;
    if (pausedLoans.length > 0) {
      if (!existingToDoMap.has(pausedLoansMessage)) {
        newToDosToInsert.push({
          message: pausedLoansMessage,
          level: "warning",
          module: "Loans & Advancements",
          action_url: "/loans-advancements",
          status: "pending",
          assigned_to: "Finance",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(pausedLoansMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    const pendingLoanRequests = loans.filter((loan: any) => loan.status === "active" && isBefore(parseISO(loan.start_date), today));
    const pendingLoanRequestsMessage = `${pendingLoanRequests.length} loan requests pending approval or review.`;
    if (pendingLoanRequests.length > 0) {
      if (!existingToDoMap.has(pendingLoanRequestsMessage)) {
        newToDosToInsert.push({
          message: pendingLoanRequestsMessage,
          level: "warning",
          module: "Loans & Advancements",
          action_url: "/loans-advancements",
          status: "pending",
          assigned_to: "Finance",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(pendingLoanRequestsMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    // --- Savings To-Dos ---
    const activeSavingPlans = savingPlans.filter((plan: any) => plan.status === "active");
    const savingsConsistencyMessage = `Review ${activeSavingPlans.length} active savings plans for consistency.`;
    if (activeSavingPlans.length > 0 && activeSavingPlans.length % 2 !== 0) {
      if (!existingToDoMap.has(savingsConsistencyMessage)) {
        newToDosToInsert.push({
          message: savingsConsistencyMessage,
          level: "info",
          module: "Savings",
          action_url: "/savings",
          status: "pending",
          assigned_to: "HR",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(savingsConsistencyMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    // --- Vacation & Absence To-Dos ---
    const overlappingLeaveRequests = leaveRecords.filter((rec: any) => {
      const leaveStart = parseISO(rec.start_date);
      const leaveEnd = parseISO(rec.end_date);
      const payrollRunDate = new Date(today.getFullYear(), today.getMonth(), 25);
      return isWithinInterval(payrollRunDate, { start: leaveStart, end: leaveEnd });
    });
    const overlappingLeaveMessage = `${overlappingLeaveRequests.length} leave requests overlap with upcoming payroll run.`;
    if (overlappingLeaveRequests.length > 0) {
      if (!existingToDoMap.has(overlappingLeaveMessage)) {
        newToDosToInsert.push({
          message: overlappingLeaveMessage,
          level: "critical",
          module: "Vacation & Absence",
          action_url: "/vacation-absence",
          status: "pending",
          assigned_to: "HR",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(overlappingLeaveMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    // --- Reports To-Dos ---
    const emp201SubmittedLastMonth = payslips.some((p: any) => p.pay_period.startsWith(lastMonth));
    const emp201Message = `EMP201 (Tax & Statutory Report) not generated for ${format(subMonths(today, 1), 'MMMM yyyy')}.`;
    if (!emp201SubmittedLastMonth) {
      if (!existingToDoMap.has(emp201Message)) {
        newToDosToInsert.push({
          message: emp201Message,
          level: "critical",
          module: "Reports",
          action_url: "/reports",
          status: "pending",
          assigned_to: "Finance",
          employee_id: null,
          related_field: null,
        });
      }
    } else {
      const existingId = existingToDoMap.get(emp201Message);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    const employeeSpecificToDosToInsert = newToDosToInsert.filter((todo: any) => todo.employee_id !== null && todo.related_field !== null);
    const generalToDosToInsert = newToDosToInsert.filter((todo: any) => todo.employee_id === null && todo.related_field === null);

    let employeeSpecificInsertCount = 0;
    if (employeeSpecificToDosToInsert.length > 0) {
      const { count, error } = await supabaseAdmin
        .from('todos')
        .upsert(employeeSpecificToDosToInsert, { onConflict: 'employee_id, related_field' })
        .select('id', { count: 'exact' });
      if (!error && typeof count === "number") {
        employeeSpecificInsertCount = count;
      }
    }

    let generalInsertCount = 0;
    if (generalToDosToInsert.length > 0) {
      const { count } = await supabaseAdmin
        .from('todos')
        .insert(generalToDosToInsert)
        .select('id', { count: 'exact' });
      if (typeof count === "number") {
        generalInsertCount = count;
      }
    }

    let updateCount = 0;
    if (toDosToUpdateToDone.length > 0) {
      const { count } = await supabaseAdmin
        .from('todos')
        .update({ status: 'done' })
        .in('id', toDosToUpdateToDone)
        .select('id', { count: 'exact' });
      if (typeof count === "number") {
        updateCount = count;
      }
    }

    return new Response(JSON.stringify({
      message: `To-Dos generated successfully. Inserted ${employeeSpecificInsertCount + generalInsertCount}, updated ${updateCount}.`,
      inserted: employeeSpecificInsertCount + generalInsertCount,
      updated: updateCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('generate-todos: Unhandled error in Edge Function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});