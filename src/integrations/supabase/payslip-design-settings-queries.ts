"use client";

import { supabase } from "@/integrations/supabase/client";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { showError } from "@/utils/toast";

type DbRow = {
  id: string;
  user_id: string | null;
  show_company_logo: boolean | null;
  show_company_details: boolean | null;
  show_employee_details: boolean | null;
  show_earnings_breakdown: boolean | null;
  show_deductions_breakdown: boolean | null;
  show_leave_summary: boolean | null;
  show_bank_details: boolean | null;
  show_ytd: boolean | null;
  show_hourly_rate: boolean | null;
  show_employee_id_number: boolean | null;
  show_employee_tax_ref_number: boolean | null;
  show_employee_address: boolean | null;
  section_order: string[] | null;
  layout_size: string | null;
  earnings_deductions_layout: string | null;
  payslip_logo_url: string | null;
  payslip_logo_width: number | null;
  payslip_logo_height: number | null;
  payslip_logo_fit: "contain" | "cover" | "fill" | "none" | "scale-down" | null;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_SETTINGS: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true,
  showBankDetails: true,
  showYTD: true,
  showHourlyRate: true,
  showEmployeeIdNumber: false,
  showEmployeeTaxRefNumber: false,
  showEmployeeAddress: false,
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
  payslipLogoUrl: "",
  payslipLogoWidth: 180,
  payslipLogoHeight: 60,
  payslipLogoFit: "contain",
};

function toDomain(row: DbRow): PayslipDesignSettings {
  if (!row) return DEFAULT_SETTINGS;

  const coercedSectionOrder =
    Array.isArray(row.section_order)
      ? (row.section_order.filter((s): s is "Earnings" | "Deductions" => s === "Earnings" || s === "Deductions"))
      : DEFAULT_SETTINGS.sectionOrder;

  const finalSectionOrder =
    coercedSectionOrder.length > 0 ? coercedSectionOrder : DEFAULT_SETTINGS.sectionOrder;

  return {
    showCompanyLogo: row.show_company_logo ?? DEFAULT_SETTINGS.showCompanyLogo,
    showCompanyDetails: row.show_company_details ?? DEFAULT_SETTINGS.showCompanyDetails,
    showEmployeeDetails: row.show_employee_details ?? DEFAULT_SETTINGS.showEmployeeDetails,
    showEarningsBreakdown: row.show_earnings_breakdown ?? DEFAULT_SETTINGS.showEarningsBreakdown,
    showDeductionsBreakdown: row.show_deductions_breakdown ?? DEFAULT_SETTINGS.showDeductionsBreakdown,
    showLeaveSummary: row.show_leave_summary ?? DEFAULT_SETTINGS.showLeaveSummary,
    showBankDetails: row.show_bank_details ?? DEFAULT_SETTINGS.showBankDetails,
    showYTD: row.show_ytd ?? DEFAULT_SETTINGS.showYTD,
    showHourlyRate: row.show_hourly_rate ?? DEFAULT_SETTINGS.showHourlyRate,
    showEmployeeIdNumber: row.show_employee_id_number ?? DEFAULT_SETTINGS.showEmployeeIdNumber,
    showEmployeeTaxRefNumber: row.show_employee_tax_ref_number ?? DEFAULT_SETTINGS.showEmployeeTaxRefNumber,
    showEmployeeAddress: row.show_employee_address ?? DEFAULT_SETTINGS.showEmployeeAddress,
    sectionOrder: finalSectionOrder,
    layoutSize: (row.layout_size as "A4" | "A5" | "Letter") ?? DEFAULT_SETTINGS.layoutSize,
    earningsDeductionsLayout: (row.earnings_deductions_layout as "deductions-left-earnings-right" | "earnings-left-deductions-right") ?? DEFAULT_SETTINGS.earningsDeductionsLayout,
    payslipLogoUrl: row.payslip_logo_url ?? DEFAULT_SETTINGS.payslipLogoUrl,
    payslipLogoWidth: (row.payslip_logo_width ?? DEFAULT_SETTINGS.payslipLogoWidth) as number,
    payslipLogoHeight: (row.payslip_logo_height ?? DEFAULT_SETTINGS.payslipLogoHeight) as number,
    payslipLogoFit: (row.payslip_logo_fit ?? DEFAULT_SETTINGS.payslipLogoFit) as "contain" | "cover" | "fill" | "none" | "scale-down",
  };
}

function fromDomain(settings: PayslipDesignSettings, userId: string): Omit<DbRow, "id"> {
  return {
    user_id: userId,
    show_company_logo: settings.showCompanyLogo,
    show_company_details: settings.showCompanyDetails,
    show_employee_details: settings.showEmployeeDetails,
    show_earnings_breakdown: settings.showEarningsBreakdown,
    show_deductions_breakdown: settings.showDeductionsBreakdown,
    show_leave_summary: settings.showLeaveSummary,
    show_bank_details: settings.showBankDetails,
    show_ytd: settings.showYTD,
    show_hourly_rate: settings.showHourlyRate,
    show_employee_id_number: settings.showEmployeeIdNumber ?? false,
    show_employee_tax_ref_number: settings.showEmployeeTaxRefNumber ?? false,
    show_employee_address: settings.showEmployeeAddress ?? false,
    section_order: settings.sectionOrder,
    layout_size: settings.layoutSize,
    earnings_deductions_layout: settings.earningsDeductionsLayout,
    payslip_logo_url: settings.payslipLogoUrl || null,
    payslip_logo_width: Number(settings.payslipLogoWidth ?? 180),
    payslip_logo_height: Number(settings.payslipLogoHeight ?? 60),
    payslip_logo_fit: settings.payslipLogoFit ?? "contain",
  };
}

export async function fetchPayslipDesignSettings(): Promise<PayslipDesignSettings> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return DEFAULT_SETTINGS;
  }
  const { data, error } = await supabase
    .from("payslip_design_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    showError("Failed to load payslip design settings.");
    return DEFAULT_SETTINGS;
  }
  const row = (data && data[0]) as DbRow | undefined;
  return toDomain(row as DbRow);
}

export async function upsertPayslipDesignSettings(settings: PayslipDesignSettings): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    showError("You must be signed in to save payslip design settings.");
    return false;
  }
  const userId = userData.user.id;

  // Try update existing row for this user
  const updatePayload = fromDomain(settings, userId);
  const { data: updated, error: updateError } = await supabase
    .from("payslip_design_settings")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id")
    .limit(1);

  if (updateError) {
    showError("Failed to update payslip design settings.");
    return false;
  }

  if (updated && updated.length > 0) {
    return true;
  }

  // If no row updated, insert a new one
  const { error: insertError } = await supabase
    .from("payslip_design_settings")
    .insert(updatePayload);

  if (insertError) {
    showError("Failed to save payslip design settings.");
    return false;
  }
  return true;
}