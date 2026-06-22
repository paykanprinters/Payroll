import { supabase, isSupabaseEnvConfigured } from "@/integrations/supabase/client";

export type DatabaseHealthStatus = "healthy" | "degraded" | "unavailable" | "mock" | "unconfigured";

export interface DatabaseTableHealth {
  table: string;
  label: string;
  status: "ok" | "error" | "skipped";
  message: string;
  latencyMs?: number;
}

export interface DatabaseHealthReport {
  overall: DatabaseHealthStatus;
  checkedAt: string;
  tables: DatabaseTableHealth[];
  summary: string;
}

const CRITICAL_TABLES: { table: string; label: string }[] = [
  { table: "employees", label: "Employees" },
  { table: "payslips", label: "Payslips" },
  { table: "company_details", label: "Company details" },
  { table: "pay_cycle_settings", label: "Pay cycle" },
  { table: "timesheets", label: "Timesheets" },
  { table: "leave_records", label: "Leave records" },
  { table: "todos", label: "To-dos" },
  { table: "tax_years", label: "Tax years" },
];

async function probeTable(table: string, label: string): Promise<DatabaseTableHealth> {
  const start = performance.now();
  try {
    const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        table,
        label,
        status: "error",
        message: error.message,
        latencyMs,
      };
    }

    return {
      table,
      label,
      status: "ok",
      message: `Reachable (${latencyMs}ms)`,
      latencyMs,
    };
  } catch (err) {
    return {
      table,
      label,
      status: "error",
      message: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Math.round(performance.now() - start),
    };
  }
}

export async function checkDatabaseHealth(options: {
  isMockDataEnabled: boolean;
  isAuthenticated: boolean;
}): Promise<DatabaseHealthReport> {
  const checkedAt = new Date().toISOString();

  if (options.isMockDataEnabled) {
    return {
      overall: "mock",
      checkedAt,
      summary: "Mock data mode — database probes are skipped.",
      tables: CRITICAL_TABLES.map(({ table, label }) => ({
        table,
        label,
        status: "skipped",
        message: "Not checked in mock mode",
      })),
    };
  }

  if (!isSupabaseEnvConfigured()) {
    return {
      overall: "unconfigured",
      checkedAt,
      summary: "Supabase environment variables are not configured for this deployment.",
      tables: CRITICAL_TABLES.map(({ table, label }) => ({
        table,
        label,
        status: "skipped",
        message: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY",
      })),
    };
  }

  if (!options.isAuthenticated) {
    return {
      overall: "unavailable",
      checkedAt,
      summary: "Sign in to verify database connectivity with your session.",
      tables: CRITICAL_TABLES.map(({ table, label }) => ({
        table,
        label,
        status: "skipped",
        message: "Authentication required",
      })),
    };
  }

  const tables = await Promise.all(
    CRITICAL_TABLES.map(({ table, label }) => probeTable(table, label))
  );

  const errorCount = tables.filter((t) => t.status === "error").length;
  const okCount = tables.filter((t) => t.status === "ok").length;

  let overall: DatabaseHealthStatus = "healthy";
  let summary = `All ${okCount} critical tables responded successfully.`;

  if (errorCount === tables.length) {
    overall = "unavailable";
    summary = "Unable to reach payroll tables — check Supabase status and RLS policies.";
  } else if (errorCount > 0) {
    overall = "degraded";
    summary = `${errorCount} of ${tables.length} table probes failed — some features may be limited.`;
  }

  return { overall, checkedAt, tables, summary };
}
