import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { format, isPast, subMonths, isBefore, isWithinInterval, parseISO } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define fields to check for incompleteness and generate To-Dos
const fieldsToFlag = [
  { key: "personal_id", label: "Personal ID (Clock-in)", level: "critical" },
  { key: "id_number", label: "National ID Number", level: "critical" },
  { key: "phone_number", label: "Mobile Number", level: "warning" },
  { key: "tax_reference_number", label: "Tax Reference Number", level: "critical" },
  { key: "iban_number", label: "Bank Account Number", level: "critical" },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      .select('id, first_name, last_name, personal_id, id_number, phone_number, tax_reference_number, iban_number, ignored_incomplete_fields');
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

    console.log(`generate-todos: Fetched ${employees.length} employees, ${payslips.length} payslips, ${loans.length} loans, ${savingPlans.length} saving plans, ${leaveRecords.length} leave records, ${timesheets.length} timesheets.`);

    const { data: existingToDos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('id, employee_id, related_field, status')
      .eq('status', 'pending'); // Only consider pending todos
    if (todosError) throw todosError;
    console.log(`generate-todos: Fetched ${existingToDos.length} existing pending To-Dos.`);

    const newToDosToInsert = [];
    const toDosToUpdateToDone = [];
    const existingToDoMap = new Map<string, string>(); // Key: employee_id-related_field, Value: todo_id

    existingToDos.forEach(todo => {
      if (todo.employee_id && todo.related_field) {
        existingToDoMap.set(`${todo.employee_id}-${todo.related_field}`, todo.id);
      } else if (!todo.employee_id && !todo.related_field) {
        // Handle general todos without employee_id/related_field
        existingToDoMap.set(todo.message, todo.id);
      }
    });

    const today = new Date();
    const currentMonth = format(today, 'yyyy-MM');
    const lastMonth = format(subMonths(today, 1), 'yyyy-MM');

    // --- Employee Profile Incompleteness To-Dos ---
    for (const employee of employees) {
      for (const field of fieldsToFlag) {
        const fieldValue = employee[field.key];
        const ignoredFields = Array.isArray(employee.ignored_incomplete_fields) ? employee.ignored_incomplete_fields : [];
        const isIgnored = ignoredFields.includes(field.key);
        const todoKey = `${employee.id}-${field.key}`;
        const existingToDoId = existingToDoMap.get(todoKey);

        if (!fieldValue && !isIgnored) {
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
        } else if ((fieldValue || isIgnored) && existingToDoId) {
          toDosToUpdateToDone.push(existingToDoId);
        }
      }
    }

    // --- Timesheet To-Dos ---
    const incompleteTimesheets = timesheets.filter(ts =>
      ts.status === "Draft" && isPast(parseISO(ts.date)) && !format(parseISO(ts.date), 'yyyy-MM').startsWith(currentMonth)
    );
    if (incompleteTimesheets.length > 0) {
      const message = `${incompleteTimesheets.length} employees have incomplete timesheets for past periods.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "critical",
          module: "Timesheet",
          action_url: "/timesheet",
          status: "pending",
          assigned_to: "HR",
        });
      }
    }

    const unapprovedTimesheets = timesheets.filter(ts =>
      ts.status === "Submitted" && isPast(parseISO(ts.date)) && !format(parseISO(ts.date), 'yyyy-MM').startsWith(currentMonth)
    );
    if (unapprovedTimesheets.length > 0) {
      const message = `${unapprovedTimesheets.length} timesheets are submitted but not yet approved.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "warning",
          module: "Timesheet",
          action_url: "/timesheet",
          status: "pending",
          assigned_to: "Admin",
        });
      }
    }

    // --- Payslips To-Dos ---
    const employeesWithoutPayslipLastMonth = employees.filter(emp =>
      !payslips.some(p => p.employee_id === emp.id && p.pay_period.startsWith(lastMonth))
    );
    if (employeesWithoutPayslipLastMonth.length > 0) {
      const message = `Payslips not generated for ${employeesWithoutPayslipLastMonth.length} employees for ${format(subMonths(today, 1), 'MMMM yyyy')}.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "critical",
          module: "Payslips",
          action_url: "/payslips/overview",
          status: "pending",
          assigned_to: "Finance",
        });
      }
    }

    // --- Loans & Advancements To-Dos ---
    const pausedLoans = loans.filter(loan => loan.paused);
    if (pausedLoans.length > 0) {
      const message = `${pausedLoans.length} loans are currently paused and require review.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "warning",
          module: "Loans & Advancements",
          action_url: "/loans-advancements",
          status: "pending",
          assigned_to: "Finance",
        });
      }
    }

    const pendingLoanRequests = loans.filter(loan => loan.status === "active" && isBefore(parseISO(loan.start_date), today));
    if (pendingLoanRequests.length > 0) {
      const message = `${pendingLoanRequests.length} loan requests pending approval or review.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          id: `TODO-LOAN-002`, // Use a fixed ID for general todos if no employee/field
          message: message,
          level: "warning",
          module: "Loans & Advancements",
          action_url: "/loans-advancements",
          status: "pending",
          assigned_to: "Finance",
        });
      }
    }

    // --- Savings To-Dos ---
    const activeSavingPlans = savingPlans.filter(plan => plan.status === "active");
    if (activeSavingPlans.length > 0 && activeSavingPlans.length % 2 !== 0) { // Mock: odd number of active plans needs review
      const message = `Review ${activeSavingPlans.length} active savings plans for consistency.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "info",
          module: "Savings",
          action_url: "/savings",
          status: "pending",
          assigned_to: "HR",
        });
      }
    }

    // --- Vacation & Absence To-Dos ---
    const overlappingLeaveRequests = leaveRecords.filter(rec => {
      const leaveStart = parseISO(rec.start_date);
      const leaveEnd = parseISO(rec.end_date);
      const payrollRunDate = new Date(today.getFullYear(), today.getMonth(), 25);
      return isWithinInterval(payrollRunDate, { start: leaveStart, end: leaveEnd });
    });
    if (overlappingLeaveRequests.length > 0) {
      const message = `${overlappingLeaveRequests.length} leave requests overlap with upcoming payroll run.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "critical",
          module: "Vacation & Absence",
          action_url: "/vacation-absence",
          status: "pending",
          assigned_to: "HR",
        });
      }
    }

    // --- Reports To-Dos ---
    const emp201SubmittedLastMonth = payslips.some(p => p.pay_period.startsWith(lastMonth));
    if (!emp201SubmittedLastMonth) {
      const message = `EMP201 (Tax & Statutory Report) not generated for ${format(subMonths(today, 1), 'MMMM yyyy')}.`;
      if (!existingToDoMap.has(message)) {
        newToDosToInsert.push({
          message: message,
          level: "critical",
          module: "Reports",
          action_url: "/reports",
          status: "pending",
          assigned_to: "Finance",
        });
      }
    }

    console.log(`generate-todos: New To-Dos to insert: ${newToDosToInsert.length}`);
    console.log(`generate-todos: To-Dos to update to done: ${toDosToUpdateToDone.length}`);

    let insertCount = 0;
    if (newToDosToInsert.length > 0) {
      const { count, error } = await supabaseAdmin
        .from('todos')
        .upsert(newToDosToInsert, { onConflict: 'employee_id, related_field' }) // Use upsert to handle potential conflicts
        .select('id', { count: 'exact' });
      if (error) {
        console.error('generate-todos: Error inserting new To-Dos:', error);
      } else {
        insertCount = count;
        console.log(`generate-todos: Inserted ${insertCount} new To-Dos.`);
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
      message: `To-Dos generated successfully. Inserted ${insertCount}, updated ${updateCount}.`,
      inserted: insertCount,
      updated: updateCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('generate-todos: Unhandled error in Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});