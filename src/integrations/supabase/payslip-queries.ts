import { createClient } from "@supabase/supabase-js";
import type { MockPayslip } from "@/lib/mock-data-interfaces";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function rowToMock(row: any): MockPayslip {
  return {
    id: row.id,
    employeeId: row.employee_id ?? "",
    payPeriod: row.pay_period ?? "",
    payDate: row.pay_date ?? "",
    grossEarnings: Number(row.gross_earnings ?? 0),
    totalDeductions: Number(row.total_deductions ?? 0),
    netPay: Number(row.net_pay ?? 0),
    earningsBreakdown: Array.isArray(row.earnings_breakdown) ? row.earnings_breakdown : [],
    deductionsBreakdown: Array.isArray(row.deductions_breakdown) ? row.deductions_breakdown : [],
    leaveSummary: row.leave_summary ?? { annual: 0, sick: 0, unpaid: 0 },
    ytdGrossEarnings: Number(row.ytd_gross_earnings ?? 0),
    ytdTotalDeductions: Number(row.ytd_total_deductions ?? 0),
  };
}

function mockToRow(p: MockPayslip): any {
  return {
    id: p.id,
    employee_id: p.employeeId,
    pay_period: p.payPeriod,
    pay_date: p.payDate,
    gross_earnings: p.grossEarnings,
    total_deductions: p.totalDeductions,
    net_pay: p.netPay,
    earnings_breakdown: p.earningsBreakdown ?? [],
    deductions_breakdown: p.deductionsBreakdown ?? [],
    leave_summary: p.leaveSummary ?? { annual: 0, sick: 0, unpaid: 0 },
    ytd_gross_earnings: p.ytdGrossEarnings ?? 0,
    ytd_total_deductions: p.ytdTotalDeductions ?? 0,
  };
}

export async function listMyPayslips(): Promise<MockPayslip[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("employee_id", uid)
    .order("pay_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMock);
}

export async function getMyPayslip(id: string): Promise<MockPayslip | null> {
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMock(data) : null;
}

// Admin-aware fetch: admins see all; non-admins see their own if permitted by RLS.
export async function fetchPayslipsFromSupabase(): Promise<MockPayslip[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? null;

  let isAdmin = false;
  try {
    const { data: adminFlag } = await supabase.rpc("is_admin");
    isAdmin = Boolean(adminFlag);
  } catch {
    isAdmin = false;
  }

  if (isAdmin) {
    const { data, error } = await supabase
      .from("payslips")
      .select("*")
      .order("pay_date", { ascending: false });
    if (error) {
      console.warn("fetchPayslipsFromSupabase (admin) error:", error);
      return [];
    }
    return (data ?? []).map(rowToMock);
  }

  if (!uid) return [];
  const { data, error } = await supabase
    .from("payslips")
    .select("*")
    .eq("employee_id", uid)
    .order("pay_date", { ascending: false });
  if (error) {
    console.warn("fetchPayslipsFromSupabase (user) error:", error);
    return [];
  }
  return (data ?? []).map(rowToMock);
}

export async function upsertPayslipToSupabase(payslip: MockPayslip): Promise<MockPayslip | null> {
  const row = mockToRow(payslip);
  const { data, error } = await supabase
    .from("payslips")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMock(data) : null;
}

export async function batchUpsertPayslipsToSupabase(payslips: MockPayslip[]): Promise<boolean> {
  if (!Array.isArray(payslips) || payslips.length === 0) return true;
  const rows = payslips.map(mockToRow);
  const { error } = await supabase.from("payslips").upsert(rows, { onConflict: "id" });
  if (error) throw error;
  return true;
}