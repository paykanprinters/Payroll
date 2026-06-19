import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_BATCH_SIZE = 500;
const PAY_PERIOD_RE = /^\d{4}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type TimesheetStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Locked";

interface TimesheetUpsertRow {
  id?: string;
  employee_id: string;
  pay_period: string;
  status?: TimesheetStatus;
  hours_worked?: number;
  overtime_hours?: number;
  notes?: string | null;
}

const ALLOWED_STATUSES = new Set<TimesheetStatus>([
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "Locked",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateTimesheetRow(raw: unknown, index: number): TimesheetUpsertRow | string {
  if (!isRecord(raw)) return `Row ${index}: expected an object`;

  const employeeId = raw.employee_id ?? raw.employeeId;
  if (typeof employeeId !== "string" || !UUID_RE.test(employeeId)) {
    return `Row ${index}: employee_id must be a valid UUID`;
  }

  const payPeriod = raw.pay_period ?? raw.payPeriod;
  if (typeof payPeriod !== "string" || !PAY_PERIOD_RE.test(payPeriod)) {
    return `Row ${index}: pay_period must be YYYY-MM`;
  }

  const row: TimesheetUpsertRow = {
    employee_id: employeeId,
    pay_period: payPeriod,
  };

  const id = raw.id;
  if (id !== undefined) {
    if (typeof id !== "string" || !UUID_RE.test(id)) {
      return `Row ${index}: id must be a valid UUID when provided`;
    }
    row.id = id;
  }

  const status = raw.status;
  if (status !== undefined) {
    if (typeof status !== "string" || !ALLOWED_STATUSES.has(status as TimesheetStatus)) {
      return `Row ${index}: invalid status`;
    }
    row.status = status as TimesheetStatus;
  }

  const hoursWorked = raw.hours_worked ?? raw.hoursWorked;
  if (hoursWorked !== undefined) {
    if (typeof hoursWorked !== "number" || !Number.isFinite(hoursWorked) || hoursWorked < 0) {
      return `Row ${index}: hours_worked must be a non-negative number`;
    }
    row.hours_worked = hoursWorked;
  }

  const overtimeHours = raw.overtime_hours ?? raw.overtimeHours;
  if (overtimeHours !== undefined) {
    if (typeof overtimeHours !== "number" || !Number.isFinite(overtimeHours) || overtimeHours < 0) {
      return `Row ${index}: overtime_hours must be a non-negative number`;
    }
    row.overtime_hours = overtimeHours;
  }

  const notes = raw.notes;
  if (notes !== undefined) {
    if (notes !== null && typeof notes !== "string") {
      return `Row ${index}: notes must be a string or null`;
    }
    row.notes = notes;
  }

  const allowedKeys = new Set([
    "id",
    "employee_id",
    "employeeId",
    "pay_period",
    "payPeriod",
    "status",
    "hours_worked",
    "hoursWorked",
    "overtime_hours",
    "overtimeHours",
    "notes",
  ]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      return `Row ${index}: unexpected field "${key}"`;
    }
  }

  return row;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userResult?.user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const userId = userResult.user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (profileError || profile?.role !== "Admin") {
      return new Response("Forbidden: Only Admins can import timesheets.", {
        status: 403,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const rawItems = Array.isArray(body) ? body : Array.isArray(body?.timesheets) ? body.timesheets : [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return new Response(JSON.stringify({ message: "No timesheets provided." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rawItems.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Batch exceeds maximum size of ${MAX_BATCH_SIZE}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validated: TimesheetUpsertRow[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const result = validateTimesheetRow(rawItems[i], i);
      if (typeof result === "string") {
        return new Response(JSON.stringify({ error: result }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      validated.push(result);
    }

    const { error, count } = await supabaseAdmin
      .from("timesheets")
      .upsert(validated, { onConflict: "id" })
      .select("id", { count: "exact" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ message: "Timesheets imported successfully.", insertedOrUpdated: count ?? 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("batch-upsert-timesheets: Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
