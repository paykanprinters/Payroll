import { supabase } from "@/integrations/supabase/client";
import { logger, toLogError } from "@/lib/logger";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { compilePersonalDataExport, type PersonalDataExport } from "@/lib/popia/compile-personal-data";
import { buildAnonymizedEmployeePayload } from "@/lib/popia/anonymize-employee";
import { recordAuditEvent } from "@/lib/audit-trail";
import type { ConsentType } from "@/lib/popia/consent";

export const POPIA_SETTINGS_ID = "00000000-0000-0000-0000-0000000000a1";

// ---------------------------------------------------------------------------
// POPIA settings (Information Officer, retention, data residency)
// ---------------------------------------------------------------------------
export interface PopiaSettings {
  id: string;
  informationOfficerName: string;
  informationOfficerEmail: string;
  informationOfficerPhone: string;
  deputyOfficerName: string;
  deputyOfficerEmail: string;
  retentionYears: number;
  dataResidencyNote: string;
  privacyPolicyUrl: string;
  regulatorComplaintUrl: string;
}

export const DEFAULT_POPIA_SETTINGS: PopiaSettings = {
  id: POPIA_SETTINGS_ID,
  informationOfficerName: "",
  informationOfficerEmail: "",
  informationOfficerPhone: "",
  deputyOfficerName: "",
  deputyOfficerEmail: "",
  retentionYears: 5,
  dataResidencyNote: "",
  privacyPolicyUrl: "",
  regulatorComplaintUrl: "https://inforegulator.org.za/",
};

function rowToPopiaSettings(row: Record<string, unknown>): PopiaSettings {
  return {
    id: (row.id as string) ?? POPIA_SETTINGS_ID,
    informationOfficerName: (row.information_officer_name as string) ?? "",
    informationOfficerEmail: (row.information_officer_email as string) ?? "",
    informationOfficerPhone: (row.information_officer_phone as string) ?? "",
    deputyOfficerName: (row.deputy_officer_name as string) ?? "",
    deputyOfficerEmail: (row.deputy_officer_email as string) ?? "",
    retentionYears: (row.retention_years as number) ?? 5,
    dataResidencyNote: (row.data_residency_note as string) ?? "",
    privacyPolicyUrl: (row.privacy_policy_url as string) ?? "",
    regulatorComplaintUrl: (row.regulator_complaint_url as string) ?? "",
  };
}

export async function fetchPopiaSettings(): Promise<PopiaSettings | null> {
  const { data, error } = await supabase.from("popia_settings").select("*").limit(1).maybeSingle();
  if (error && error.code !== "PGRST116") {
    logger.error("popia-queries: fetch settings failed", toLogError(error));
    return null;
  }
  return data ? rowToPopiaSettings(data) : null;
}

export async function upsertPopiaSettings(
  settings: PopiaSettings,
  updatedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    id: settings.id || POPIA_SETTINGS_ID,
    information_officer_name: settings.informationOfficerName.trim() || null,
    information_officer_email: settings.informationOfficerEmail.trim() || null,
    information_officer_phone: settings.informationOfficerPhone.trim() || null,
    deputy_officer_name: settings.deputyOfficerName.trim() || null,
    deputy_officer_email: settings.deputyOfficerEmail.trim() || null,
    retention_years: settings.retentionYears,
    data_residency_note: settings.dataResidencyNote.trim() || null,
    privacy_policy_url: settings.privacyPolicyUrl.trim() || null,
    regulator_complaint_url: settings.regulatorComplaintUrl.trim() || null,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? null,
  };
  const { error } = await supabase.from("popia_settings").upsert(payload, { onConflict: "id" });
  if (error) {
    logger.error("popia-queries: upsert settings failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  await recordAuditEvent({
    severity: "change",
    module: "settings",
    action: "popia_settings_updated",
    message: "POPIA settings updated",
    entityType: "settings",
    entityId: "popia",
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Consent register
// ---------------------------------------------------------------------------
export interface ConsentRecord {
  id: string;
  employeeId: string;
  consentType: ConsentType;
  granted: boolean;
  method: string | null;
  notes: string | null;
  source: string;
  grantedAt: string | null;
  revokedAt: string | null;
  updatedAt: string;
}

function rowToConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    consentType: row.consent_type as ConsentType,
    granted: !!row.granted,
    method: (row.method as string) ?? null,
    notes: (row.notes as string) ?? null,
    source: (row.source as string) ?? "admin",
    grantedAt: (row.granted_at as string) ?? null,
    revokedAt: (row.revoked_at as string) ?? null,
    updatedAt: (row.updated_at as string) ?? "",
  };
}

export async function fetchConsentForEmployee(employeeId: string): Promise<ConsentRecord[]> {
  const { data, error } = await supabase
    .from("consent_records")
    .select("*")
    .eq("employee_id", employeeId);
  if (error) {
    logger.error("popia-queries: fetch consent failed", toLogError(error));
    return [];
  }
  return (data ?? []).map(rowToConsent);
}

export async function setConsent(params: {
  employeeId: string;
  consentType: ConsentType;
  granted: boolean;
  method?: string;
  notes?: string;
  source?: "admin" | "self";
  recordedBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const payload = {
    employee_id: params.employeeId,
    consent_type: params.consentType,
    granted: params.granted,
    method: params.method ?? null,
    notes: params.notes ?? null,
    source: params.source ?? "admin",
    granted_at: params.granted ? now : null,
    revoked_at: params.granted ? null : now,
    recorded_by: params.recordedBy ?? null,
    updated_at: now,
  };
  const { error } = await supabase
    .from("consent_records")
    .upsert(payload, { onConflict: "employee_id,consent_type" });
  if (error) {
    logger.error("popia-queries: set consent failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  await recordAuditEvent({
    severity: "change",
    module: "employee",
    action: params.granted ? "consent_granted" : "consent_revoked",
    message: `Consent ${params.granted ? "granted" : "revoked"}: ${params.consentType}`,
    entityType: "employee",
    entityId: params.employeeId,
    metadata: { consentType: params.consentType, source: params.source ?? "admin" },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Versioned privacy notice + acceptances
// ---------------------------------------------------------------------------
export interface PrivacyPolicy {
  id: string;
  version: string;
  title: string;
  body: string;
  summary: string | null;
  effectiveDate: string | null;
  published: boolean;
  createdAt: string;
}

function rowToPolicy(row: Record<string, unknown>): PrivacyPolicy {
  return {
    id: row.id as string,
    version: row.version as string,
    title: row.title as string,
    body: row.body as string,
    summary: (row.summary as string) ?? null,
    effectiveDate: (row.effective_date as string) ?? null,
    published: !!row.published,
    createdAt: (row.created_at as string) ?? "",
  };
}

export async function fetchPrivacyPolicies(): Promise<PrivacyPolicy[]> {
  const { data, error } = await supabase
    .from("privacy_policies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("popia-queries: fetch policies failed", toLogError(error));
    return [];
  }
  return (data ?? []).map(rowToPolicy);
}

export async function fetchActivePrivacyPolicy(): Promise<PrivacyPolicy | null> {
  const { data, error } = await supabase
    .from("privacy_policies")
    .select("*")
    .eq("published", true)
    .order("effective_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    logger.error("popia-queries: fetch active policy failed", toLogError(error));
    return null;
  }
  return data ? rowToPolicy(data) : null;
}

export async function upsertPrivacyPolicy(
  policy: Partial<PrivacyPolicy> & { version: string; title: string; body: string },
  createdBy?: string
): Promise<{ ok: boolean; error?: string }> {
  const payload: Record<string, unknown> = {
    version: policy.version.trim(),
    title: policy.title.trim(),
    body: policy.body,
    summary: policy.summary?.trim() || null,
    effective_date: policy.effectiveDate || null,
    published: policy.published ?? false,
  };
  if (policy.id) payload.id = policy.id;
  else payload.created_by = createdBy ?? null;

  const { error } = await supabase
    .from("privacy_policies")
    .upsert(payload, { onConflict: "id" });
  if (error) {
    logger.error("popia-queries: upsert policy failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Publishes one policy version and unpublishes the rest (single active notice). */
export async function publishPrivacyPolicy(policyId: string): Promise<{ ok: boolean; error?: string }> {
  const { error: clearErr } = await supabase
    .from("privacy_policies")
    .update({ published: false })
    .neq("id", policyId);
  if (clearErr) {
    logger.error("popia-queries: clear published failed", toLogError(clearErr));
    return { ok: false, error: clearErr.message };
  }
  const { error } = await supabase
    .from("privacy_policies")
    .update({ published: true })
    .eq("id", policyId);
  if (error) {
    logger.error("popia-queries: publish failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function recordPolicyAcceptance(
  policy: PrivacyPolicy,
  userId: string,
  employeeId?: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("privacy_policy_acceptances").upsert(
    {
      policy_id: policy.id,
      policy_version: policy.version,
      user_id: userId,
      employee_id: employeeId ?? null,
      accepted_at: new Date().toISOString(),
    },
    { onConflict: "policy_id,user_id" }
  );
  if (error) {
    logger.error("popia-queries: record acceptance failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function hasAcceptedPolicy(policyId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("privacy_policy_acceptances")
    .select("id")
    .eq("policy_id", policyId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") return false;
  return !!data;
}

export interface AcceptanceSummary {
  policyId: string;
  count: number;
}

export async function fetchAcceptanceCount(policyId: string): Promise<number> {
  const { count, error } = await supabase
    .from("privacy_policy_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("policy_id", policyId);
  if (error) return 0;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Data breach register
// ---------------------------------------------------------------------------
export interface BreachIncident {
  id: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "contained" | "resolved" | "closed";
  discoveredAt: string | null;
  occurredAt: string | null;
  affectedCount: number | null;
  affectedDescription: string | null;
  regulatorNotified: boolean;
  regulatorNotifiedAt: string | null;
  subjectsNotified: boolean;
  subjectsNotifiedAt: string | null;
  remediation: string | null;
  createdAt: string;
}

function rowToBreach(row: Record<string, unknown>): BreachIncident {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    severity: (row.severity as BreachIncident["severity"]) ?? "medium",
    status: (row.status as BreachIncident["status"]) ?? "open",
    discoveredAt: (row.discovered_at as string) ?? null,
    occurredAt: (row.occurred_at as string) ?? null,
    affectedCount: (row.affected_count as number) ?? null,
    affectedDescription: (row.affected_description as string) ?? null,
    regulatorNotified: !!row.regulator_notified,
    regulatorNotifiedAt: (row.regulator_notified_at as string) ?? null,
    subjectsNotified: !!row.subjects_notified,
    subjectsNotifiedAt: (row.subjects_notified_at as string) ?? null,
    remediation: (row.remediation as string) ?? null,
    createdAt: (row.created_at as string) ?? "",
  };
}

export async function fetchBreachIncidents(): Promise<BreachIncident[]> {
  const { data, error } = await supabase
    .from("data_breach_incidents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("popia-queries: fetch breaches failed", toLogError(error));
    return [];
  }
  return (data ?? []).map(rowToBreach);
}

export interface BreachInput {
  id?: string;
  title: string;
  description?: string;
  severity: BreachIncident["severity"];
  status: BreachIncident["status"];
  discoveredAt?: string | null;
  occurredAt?: string | null;
  affectedCount?: number | null;
  affectedDescription?: string;
  regulatorNotified: boolean;
  subjectsNotified: boolean;
  remediation?: string;
}

export async function upsertBreachIncident(
  input: BreachInput,
  reportedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    severity: input.severity,
    status: input.status,
    discovered_at: input.discoveredAt || null,
    occurred_at: input.occurredAt || null,
    affected_count: input.affectedCount ?? null,
    affected_description: input.affectedDescription?.trim() || null,
    regulator_notified: input.regulatorNotified,
    regulator_notified_at: input.regulatorNotified ? now : null,
    subjects_notified: input.subjectsNotified,
    subjects_notified_at: input.subjectsNotified ? now : null,
    remediation: input.remediation?.trim() || null,
    updated_at: now,
  };
  if (input.id) payload.id = input.id;
  else payload.reported_by = reportedBy ?? null;

  const { error } = await supabase
    .from("data_breach_incidents")
    .upsert(payload, { onConflict: "id" });
  if (error) {
    logger.error("popia-queries: upsert breach failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  await recordAuditEvent({
    severity: "alert",
    module: "system",
    action: input.id ? "breach_updated" : "breach_logged",
    message: `Data breach ${input.id ? "updated" : "logged"}: ${input.title}`,
    entityType: "system",
    entityId: "breach-register",
    metadata: { severity: input.severity, status: input.status },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Processing register
// ---------------------------------------------------------------------------
export interface ProcessingEntry {
  id: string;
  category: string;
  purpose: string;
  lawfulBasis: string;
  dataSubjects: string | null;
  recipients: string | null;
  retention: string | null;
  crossBorder: boolean;
  specialPi: boolean;
  notes: string | null;
  sortOrder: number;
}

function rowToProcessing(row: Record<string, unknown>): ProcessingEntry {
  return {
    id: row.id as string,
    category: row.category as string,
    purpose: row.purpose as string,
    lawfulBasis: row.lawful_basis as string,
    dataSubjects: (row.data_subjects as string) ?? null,
    recipients: (row.recipients as string) ?? null,
    retention: (row.retention as string) ?? null,
    crossBorder: !!row.cross_border,
    specialPi: !!row.special_pi,
    notes: (row.notes as string) ?? null,
    sortOrder: (row.sort_order as number) ?? 100,
  };
}

export async function fetchProcessingRegister(): Promise<ProcessingEntry[]> {
  const { data, error } = await supabase
    .from("data_processing_register")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    logger.error("popia-queries: fetch processing register failed", toLogError(error));
    return [];
  }
  return (data ?? []).map(rowToProcessing);
}

// ---------------------------------------------------------------------------
// DSAR: compile + anonymise
// ---------------------------------------------------------------------------
async function fetchByEmployee(table: string, employeeId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.from(table).select("*").eq("employee_id", employeeId);
  if (error) {
    logger.warn(`popia-queries: fetch ${table} for export failed`, toLogError(error));
    return [];
  }
  return (data ?? []) as Record<string, unknown>[];
}

export async function compilePersonalDataForEmployee(employee: MockEmployee): Promise<PersonalDataExport> {
  const [payslips, timesheets, leave, loans, savings, consents] = await Promise.all([
    fetchByEmployee("payslips", employee.id),
    fetchByEmployee("timesheets", employee.id),
    fetchByEmployee("leave_records", employee.id),
    fetchByEmployee("loans", employee.id),
    fetchByEmployee("saving_plans", employee.id),
    fetchByEmployee("consent_records", employee.id),
  ]);

  // Notification history is keyed by recipient (email/phone), not employee_id.
  const recipients = [employee.email, employee.phoneNumber].filter(Boolean) as string[];
  let notifications: Record<string, unknown>[] = [];
  if (recipients.length > 0) {
    const { data } = await supabase
      .from("notification_log")
      .select("channel, category, recipient, subject, status, created_at")
      .in("recipient", recipients);
    notifications = (data ?? []) as Record<string, unknown>[];
  }

  await recordAuditEvent({
    severity: "info",
    module: "employee",
    action: "dsar_export",
    message: `Personal-data export generated for ${employee.firstName} ${employee.lastName}`,
    entityType: "employee",
    entityId: employee.id,
  });

  return compilePersonalDataExport({
    employee,
    payslips,
    timesheets,
    leave,
    loans,
    savings,
    consents,
    notifications,
  });
}

export async function anonymizeEmployee(
  employeeId: string,
  anonymizedBy?: string
): Promise<{ ok: boolean; error?: string }> {
  const payload = buildAnonymizedEmployeePayload(employeeId, anonymizedBy);
  let { error } = await supabase.from("employees").update(payload).eq("id", employeeId);

  // Graceful fallback if optional COMP columns are absent in this environment.
  if (error && /(medical_aid_(member|dependants)|retirement_fund_contribution_(percent|fixed)|anonymized_(at|by))/.test(error.message || "")) {
    const fallback = { ...payload };
    delete (fallback as Record<string, unknown>).medical_aid_member;
    delete (fallback as Record<string, unknown>).medical_aid_dependants;
    delete (fallback as Record<string, unknown>).retirement_fund_contribution_percent;
    delete (fallback as Record<string, unknown>).retirement_fund_contribution_fixed;
    ({ error } = await supabase.from("employees").update(fallback).eq("id", employeeId));
  }

  if (error) {
    logger.error("popia-queries: anonymize failed", toLogError(error));
    return { ok: false, error: error.message };
  }
  await recordAuditEvent({
    severity: "alert",
    module: "employee",
    action: "employee_anonymized",
    message: "Employee personal information anonymised (POPIA erasure)",
    entityType: "employee",
    entityId: employeeId,
  });
  return { ok: true };
}
