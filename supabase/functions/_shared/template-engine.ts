// Variable interpolation for DB-stored message templates.

export type TemplateVariables = Record<string, string | number | undefined | null>;

export function interpolateTemplate(template: string, vars: TemplateVariables): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

export function formatSaDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function isBlank(value?: string | null): boolean {
  return !value || !String(value).trim();
}

/** Payroll profile fields employees commonly still need to supply after onboarding. */
const OUTSTANDING_PROFILE_FIELDS: {
  key: string;
  label: string;
  get: (employee: EmployeeProfileFields) => string | null | undefined;
}[] = [
  { key: "idNumber", label: "South African ID / passport number", get: (e) => e.id_number },
  { key: "phoneNumber", label: "Mobile number", get: (e) => e.phone_number },
  { key: "email", label: "Email address", get: (e) => e.email },
  { key: "taxReferenceNumber", label: "Tax reference number (SARS)", get: (e) => e.tax_reference_number },
  { key: "bankName", label: "Bank name", get: (e) => e.bank_name },
  { key: "accountNumber", label: "Bank account number", get: (e) => e.iban_number },
  { key: "branchCode", label: "Bank branch code", get: (e) => e.routing_swift_code },
  {
    key: "address",
    label: "Residential address",
    get: (e) => e.address_line1 || e.permanent_address,
  },
];

export interface EmployeeProfileFields {
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  start_date?: string | null;
  email?: string | null;
  phone_number?: string | null;
  id_number?: string | null;
  tax_reference_number?: string | null;
  bank_name?: string | null;
  /** Stored as iban_number in employees table (bank account number). */
  iban_number?: string | null;
  /** Stored as routing_swift_code in employees table (branch code). */
  routing_swift_code?: string | null;
  address_line1?: string | null;
  permanent_address?: string | null;
  payment_mode?: string | null;
}

const CASH_SKIP_KEYS = new Set([
  "taxReferenceNumber",
  "bankName",
  "accountNumber",
  "branchCode",
]);

export function listOutstandingProfileItems(employee: EmployeeProfileFields): string[] {
  const isCash = employee.payment_mode === "Cash";
  return OUTSTANDING_PROFILE_FIELDS.filter((field) => {
    if (isCash && CASH_SKIP_KEYS.has(field.key)) return false;
    return isBlank(field.get(employee));
  }).map((field) => field.label);
}

export function buildOutstandingSectionHtml(items: string[], contactName: string): string {
  if (items.length === 0) {
    return `<p style="margin:0 0 16px;font-size:14px;">Your payroll profile details look complete — thank you.</p>`;
  }

  const list = items
    .map(
      (label) =>
        `<li style="margin:0 0 6px;font-size:14px;color:#1f2937;">${label}</li>`,
    )
    .join("");

  return `<div style="margin:0 0 16px;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
  <p style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#111827;">To complete your payroll profile, please provide:</p>
  <ul style="margin:0 0 10px;padding-left:20px;">${list}</ul>
  <p style="margin:0;font-size:13px;color:#4b5563;">Please send these details to <strong>${contactName}</strong> so we can finalise your setup and pay you correctly and on time.</p>
</div>`;
}

export function buildOutstandingSectionText(items: string[], contactName: string): string {
  if (items.length === 0) return "";
  return `Still needed: ${items.join(", ")}. Please send these to ${contactName}.`;
}

export function buildEmployeeWelcomeVariables(input: {
  employee: EmployeeProfileFields;
  company?: {
    companylegalname?: string | null;
    companytradingname?: string | null;
  } | null;
  settings?: {
    from_name?: string | null;
    reply_to?: string | null;
    portal_url?: string | null;
  } | null;
  hrContactName?: string;
}): TemplateVariables {
  const firstName = input.employee.first_name?.trim() || "there";
  const lastName = input.employee.last_name?.trim() || "";
  const companyLegal = input.company?.companylegalname?.trim() || "";
  const companyTrading = input.company?.companytradingname?.trim() || "";
  const companyName = companyTrading || companyLegal || input.settings?.from_name?.trim() || "Kan Printers";
  const hrContactName = input.hrContactName?.trim() || "Melanie Kanasashi";
  const outstandingItems = listOutstandingProfileItems(input.employee);

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    companyName,
    companyLegalName: companyLegal || companyName,
    companyTradingName: companyTrading || companyName,
    jobTitle: input.employee.job_title?.trim() || "Team member",
    startDate: formatSaDate(input.employee.start_date),
    portalUrl: input.settings?.portal_url?.trim() || "",
    replyEmail: input.settings?.reply_to?.trim() || "",
    hrContactName,
    outstandingItemsHtml: buildOutstandingSectionHtml(outstandingItems, hrContactName),
    outstandingItemsText: buildOutstandingSectionText(outstandingItems, hrContactName),
  };
}
