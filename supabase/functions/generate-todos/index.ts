import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { format, isPast, subMonths, isWithinInterval, parseISO } from "https://esm.sh/date-fns@2.30.0";
import { getCorsHeaders } from "../_shared/cors.ts";

// Define fields to check for incompleteness and generate To-Dos
// IMPORTANT: These keys must match the snake_case column names in the Supabase 'employees' table
const fieldsToFlag = [
  { key: "personal_id", label: "Personal ID (Clock-in)", level: "critical" },
  { key: "phone_number", label: "Mobile Number", level: "warning" },
];

serve(async (req) => {
  console.log('generate-todos: Function started processing request.');
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('generate-todos: Function invoked.');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('generate-todos: Unauthorized - Missing Authorization header');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      console.error('generate-todos: Unauthorized - Error getting requesting user:', userError?.message || 'User not found');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: requestingUserProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || requestingUserProfile?.role !== 'Admin') {
      console.error('generate-todos: Forbidden - User is not an Admin or profile not found:', profileError?.message || 'Role not Admin');
      return new Response('Forbidden: Only Admins can generate To-Dos.', { status: 403, headers: corsHeaders });
    }

    console.log('generate-todos: User is Admin, proceeding to fetch data.');

    // Fetch all necessary data from Supabase
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, personal_id, phone_number, ignored_incomplete_fields');
    if (employeesError) throw employeesError;
    console.log(`generate-todos: Fetched ${employees.length} employees.`);

    const { data: payslips, error: payslipsError } = await supabaseAdmin
      .from('payslips')
      .select('employee_id, pay_period');
    if (payslipsError) throw payslipsError;
    console.log(`generate-todos: Fetched ${payslips.length} payslips.`);

    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('id, employee_id, paused');
    if (loansError) throw loansError;
    console.log(`generate-todos: Fetched ${loans.length} loans.`);

    const { data: savingPlans, error: savingPlansError } = await supabaseAdmin
      .from('saving_plans')
      .select('id, employee_id, status');
    if (savingPlansError) throw savingPlansError;
    console.log(`generate-todos: Fetched ${savingPlans.length} saving plans.`);

    const { data: leaveRecords, error: leaveRecordsError } = await supabaseAdmin
      .from('leave_records')
      .select('id, employee_id, start_date, end_date');
    if (leaveRecordsError) throw leaveRecordsError;
    console.log(`generate-todos: Fetched ${leaveRecords.length} leave records.`);

    const { data: timesheets, error: timesheetsError } = await supabaseAdmin
      .from('timesheets')
      .select('id, employee_id, date, status');
    if (timesheetsError) throw timesheetsError;
    console.log(`generate-todos: Fetched ${timesheets.length} timesheets.`);

    const { data: existingToDos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('id, employee_id, related_field, message, status')
      .eq('status', 'pending');
    if (todosError) throw todosError;
    console.log(`generate-todos: Fetched ${existingToDos.length} existing pending To-Dos.`);

    const newToDosToInsert = [];
    const toDosToUpdateToDone = [];
    const existingToDoMap = new Map<string, string>(); // Key: employee_id-related_field or message, Value: todo_id

    existingToDos.forEach(todo => {
      if (todo.employee_id && todo.related_field) {
        existingToDoMap.set(`${todo.employee_id}-${todo.related_field}`, todo.id);
      } else {
        existingToDoMap.set(todo.message, todo.id);
      }
    });
    console.log('generate-todos: Populated existing To-Do map.');

    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const lastMonth = format(subMonths(today, 1), 'yyyy-MM');

    // --- Employee Profile Incompleteness To-Dos ---
    console.log('generate-todos: Checking employee profile incompleteness...');
    for (const employee of employees) {
      for (const field of fieldsToFlag) {
        const fieldValue = employee[field.key];
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
    console.log('generate-todos: Finished checking employee profile incompleteness.');

    // --- Timesheet To-Dos ---
    console.log('generate-todos: Checking timesheet To-Dos...');
    const incompleteTimesheets = timesheets.filter(ts =>
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
          employee_id: null, // Explicitly null
          related_field: null, // Explicitly null
        });
      }
    } else {
      const existingId = existingToDoMap.get(incompleteTimesheetsMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }

    const unapprovedTimesheets = timesheets.filter(ts =>
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
          employee_id: null, // Explicitly null
          related_field: null, // Explicitly null
        });
      }
    } else {
      const existingId = existingToDoMap.get(unapprovedTimesheetsMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }
    console.log('generate-todos: Finished checking timesheet To-Dos.');

    // --- Payslips To-Dos ---
    console.log('generate-todos: Checking payslip To-Dos...');
    const employeesWithoutPayslipLastMonth = employees.filter(emp =>
      !payslips.some(p => p.employee_id === emp.id && p.pay_period.startsWith(lastMonth))
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
          employee_id: null, // Explicitly null
          related_field: null, // Explicitly null
        });
      }
    } else {
      const existingId = existingToDoMap.get(payslipMissingMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }
    console.log('generate-todos: Finished checking payslip To-Dos.');

    // --- Loans & Advancements To-Dos ---
    // Loans are admin-created (active | completed only). There is no employee
    // application / approval workflow — creating the loan is the approval.
    // Retire any legacy "pending approval" todos that can never be resolved.
    console.log('generate-todos: Checking loans To-Dos...');
    for (const todo of existingToDos) {
      if (
        todo.status === "pending" &&
        typeof todo.message === "string" &&
        todo.message.includes("loan requests pending approval or review")
      ) {
        toDosToUpdateToDone.push(todo.id);
      }
    }

    const pausedLoans = loans.filter(loan => loan.paused);
    const pausedLoansMessage = `${pausedLoans.length} loans are currently paused and require review.`;
    for (const todo of existingToDos) {
      if (
        todo.status === "pending" &&
        typeof todo.message === "string" &&
        todo.message.includes("loans are currently paused and require review") &&
        (pausedLoans.length === 0 || todo.message !== pausedLoansMessage)
      ) {
        toDosToUpdateToDone.push(todo.id);
      }
    }
    if (pausedLoans.length > 0 && !existingToDoMap.has(pausedLoansMessage)) {
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
    console.log('generate-todos: Finished checking loans To-Dos.');

    // --- Savings To-Dos ---
    console.log('generate-todos: Checking savings To-Dos...');
    const activeSavingPlans = savingPlans.filter(plan => plan.status === "active");
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
          employee_id: null, // Explicitly null
          related_field: null, // Explicitly null
        });
      }
    } else {
      const existingId = existingToDoMap.get(savingsConsistencyMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }
    console.log('generate-todos: Finished checking savings To-Dos.');

    // --- Vacation & Absence To-Dos ---
    console.log('generate-todos: Checking vacation & absence To-Dos...');
    const overlappingLeaveRequests = leaveRecords.filter(rec => {
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
          employee_id: null, // Explicitly null
          related_field: null, // Explicitly null
        });
      }
    } else {
      const existingId = existingToDoMap.get(overlappingLeaveMessage);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }
    console.log('generate-todos: Finished checking vacation & absence To-Dos.');

    // --- Reports To-Dos ---
    console.log('generate-todos: Checking reports To-Dos...');
    const emp201SubmittedLastMonth = payslips.some(p => p.pay_period.startsWith(lastMonth));
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
          employee_id: null, // Explicitly null
          related_field: null, // Explicitly null
        });
      }
    } else {
      const existingId = existingToDoMap.get(emp201Message);
      if (existingId) {
        toDosToUpdateToDone.push(existingId);
      }
    }
    console.log('generate-todos: Finished checking reports To-Dos.');

    console.log(`generate-todos: New To-Dos to insert: ${newToDosToInsert.length}`);
    console.log(`generate-todos: To-Dos to update to done: ${toDosToUpdateToDone.length}`);

    const employeeSpecificToDosToInsert = newToDosToInsert.filter(todo => todo.employee_id !== null && todo.related_field !== null);
    const generalToDosToInsert = newToDosToInsert.filter(todo => todo.employee_id === null && todo.related_field === null);

    let employeeSpecificInsertCount = 0;
    if (employeeSpecificToDosToInsert.length > 0) {
      const { count, error } = await supabaseAdmin
        .from('todos')
        .upsert(employeeSpecificToDosToInsert, { onConflict: 'employee_id, related_field' })
        .select('id', { count: 'exact' });
      if (error) {
        console.error('generate-todos: Error inserting employee-specific To-Dos:', error);
      } else {
        employeeSpecificInsertCount = count;
        console.log(`generate-todos: Inserted ${employeeSpecificInsertCount} employee-specific To-Dos.`);
      }
    }

    let generalInsertCount = 0;
    if (generalToDosToInsert.length > 0) {
      // For general todos, we rely on the initial check against existingToDoMap
      // and perform a simple insert for truly new ones.
      const { count, error } = await supabaseAdmin
        .from('todos')
        .insert(generalToDosToInsert)
        .select('id', { count: 'exact' });
      if (error) {
        console.error('generate-todos: Error inserting general To-Dos:', error);
      } else {
        generalInsertCount = count;
        console.log(`generate-todos: Inserted ${generalInsertCount} general To-Dos.`);
      }
    }

    let updateCount = 0;
    if (toDosToUpdateToDone.length > 0) {
      const { count, error } = await supabaseAdmin
        .from('todos')
        .update({ status: 'done' })
        .in('id', toDosToUpdateToDone)
        .select('id', { count: 'exact' });
      if (error) {
        console.error('generate-todos: Error updating To-Dos to done:', error);
      } else {
        updateCount = count;
        console.log(`generate-todos: Updated ${updateCount} To-Dos to 'done'.`);
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