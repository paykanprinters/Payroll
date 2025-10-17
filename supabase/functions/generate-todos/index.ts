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
    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify if the current user making the request is an Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requestingUser) {
      console.error('Error getting requesting user:', userError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { data: requestingUserProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requestingUser.id)
      .single();

    if (profileError || requestingUserProfile?.role !== 'Admin') {
      console.error('User is not an Admin or profile not found:', profileError);
      return new Response('Forbidden: Only Admins can generate To-Dos.', { status: 403, headers: corsHeaders });
    }

    // Fetch all employees
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, personal_id, id_number, phone_number, tax_reference_number, iban_number, ignored_incomplete_fields');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch employees for To-Do generation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Fetch existing pending To-Dos related to employee fields
    const { data: existingToDos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('id, employee_id, related_field, status')
      .eq('status', 'pending')
      .not('employee_id', 'is', null)
      .not('related_field', 'is', null);

    if (todosError) {
      console.error('Error fetching existing To-Dos:', todosError);
      return new Response(JSON.stringify({ error: 'Failed to fetch existing To-Dos.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const newToDosToInsert = [];
    const toDosToUpdateToDone = []; // For To-Dos that are now complete
    const existingToDoMap = new Map<string, string>(); // Key: employee_id-related_field, Value: todo_id

    existingToDos.forEach(todo => {
      if (todo.employee_id && todo.related_field) {
        existingToDoMap.set(`${todo.employee_id}-${todo.related_field}`, todo.id);
      }
    });

    for (const employee of employees) {
      for (const field of fieldsToFlag) {
        const fieldValue = employee[field.key];
        const isIgnored = employee.ignored_incomplete_fields?.includes(field.key);
        const todoKey = `${employee.id}-${field.key}`;
        const existingToDoId = existingToDoMap.get(todoKey);

        if (!fieldValue && !isIgnored) {
          // Field is incomplete and not ignored, create or keep pending To-Do
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
          // If it exists, it's already pending, so no action needed (it stays pending)
        } else if ((fieldValue || isIgnored) && existingToDoId) {
          // Field is now complete or ignored, but a pending To-Do exists. Mark it as done.
          toDosToUpdateToDone.push(existingToDoId);
        }
      }
    }

    // Perform database operations
    let insertCount = 0;
    if (newToDosToInsert.length > 0) {
      const { count, error } = await supabaseAdmin
        .from('todos')
        .insert(newToDosToInsert, { onConflict: 'employee_id, related_field' }) // Prevent duplicates
        .select('id', { count: 'exact' });
      if (error) {
        console.error('Error inserting new To-Dos:', error);
      } else {
        insertCount = count;
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
        console.error('Error updating To-Dos to done:', error);
      } else {
        updateCount = count;
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
    console.error('Unhandled error in generate-todos Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});