import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    console.log('generate-todos: User is Admin, proceeding to fetch employees.');

    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, personal_id, id_number, phone_number, tax_reference_number, iban_number, ignored_incomplete_fields');

    if (employeesError) {
      console.error('generate-todos: Error fetching employees:', employeesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch employees for To-Do generation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`generate-todos: Fetched ${employees.length} employees.`);

    const { data: existingToDos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('id, employee_id, related_field, status')
      .eq('status', 'pending')
      .not('employee_id', 'is', null)
      .not('related_field', 'is', null);

    if (todosError) {
      console.error('generate-todos: Error fetching existing To-Dos:', todosError);
      return new Response(JSON.stringify({ error: 'Failed to fetch existing To-Dos.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log(`generate-todos: Fetched ${existingToDos.length} existing pending To-Dos.`);

    const newToDosToInsert = [];
    const toDosToUpdateToDone = [];
    const existingToDoMap = new Map<string, string>();

    existingToDos.forEach(todo => {
      if (todo.employee_id && todo.related_field) {
        existingToDoMap.set(`${todo.employee_id}-${todo.related_field}`, todo.id);
      }
    });

    for (const employee of employees) {
      for (const field of fieldsToFlag) {
        const fieldValue = employee[field.key];
        // Ensure ignored_incomplete_fields is an array before calling .includes()
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

    console.log(`generate-todos: New To-Dos to insert: ${newToDosToInsert.length}`);
    console.log(`generate-todos: To-Dos to update to done: ${toDosToUpdateToDone.length}`);

    let insertCount = 0;
    if (newToDosToInsert.length > 0) {
      const { count, error } = await supabaseAdmin
        .from('todos')
        .insert(newToDosToInsert, { onConflict: 'employee_id, related_field' })
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