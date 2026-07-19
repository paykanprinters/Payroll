import { MockEmployee } from "@/lib/mock-data-interfaces";

/**
 * POPIA retention-aware erasure.
 *
 * Statutory payroll records (payslips, tax records) must be retained for ~5 years,
 * so we cannot hard-delete an employee whose pay history must survive. Instead we
 * redact the identifying personal information on the master record while keeping a
 * minimal, non-identifying statutory skeleton (employee number, role, dates).
 *
 * Returns a snake_case partial suitable for a Supabase `employees` update.
 * Note column quirks: accountNumber -> iban_number, branchCode -> routing_swift_code.
 */
export function buildAnonymizedEmployeePayload(
  employeeId: string,
  anonymizedBy?: string | null,
  now: Date = new Date()
): Record<string, unknown> {
  return {
    id: employeeId,
    // Replace names with non-identifying placeholders (kept non-null for UI safety).
    first_name: "Redacted",
    last_name: "Employee",
    // Identifying contact details.
    email: null,
    phone_number: null,
    personal_id: null,
    // Government / statutory identifiers.
    id_number: null,
    tax_reference_number: null,
    uif_number: null,
    mol_id: null,
    // Demographics.
    date_of_birth: null,
    gender: null,
    fathers_name: null,
    origin_country: null,
    // Addresses.
    address_line1: null,
    address_line2: null,
    city: null,
    province: null,
    postal_code: null,
    permanent_address: null,
    // Emergency contacts (third-party PI).
    emergency_contact_name: null,
    emergency_contact_number: null,
    emergency_contact_address: null,
    // Banking (financial PI).
    bank_name: null,
    bank_account_holder: null,
    iban_number: null,
    routing_swift_code: null,
    bank_account_type: null,
    // Remuneration figures (retained in payslip snapshots).
    salary: null,
    hourly_rate: null,
    // Special PI (health).
    medical_aid_member: false,
    medical_aid_dependants: null,
    retirement_fund_contribution_percent: null,
    retirement_fund_contribution_fixed: null,
    // Sever portal access / auth linkage.
    portal_access: false,
    user_id: null,
    // Erasure markers.
    anonymized_at: now.toISOString(),
    anonymized_by: anonymizedBy ?? null,
  };
}

/** Fields that are NOT redacted (kept for the statutory skeleton). */
export const ANONYMIZE_PRESERVED_FIELDS: (keyof MockEmployee)[] = [
  "id",
  "customEmployeeId",
  "jobTitle",
  "department",
  "workLocation",
  "startDate",
  "terminationDate",
  "dateOfConfirmation",
  "employmentType",
  "payFrequency",
];

export function isAnonymized(employee: Pick<MockEmployee, "firstName"> & { anonymizedAt?: string | null }): boolean {
  return Boolean(employee.anonymizedAt);
}
