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

export function buildEmployeeWelcomeVariables(input: {
  employee: {
    first_name?: string | null;
    last_name?: string | null;
    job_title?: string | null;
    start_date?: string | null;
  };
  company?: {
    companylegalname?: string | null;
    companytradingname?: string | null;
  } | null;
  settings?: {
    from_name?: string | null;
    reply_to?: string | null;
    portal_url?: string | null;
  } | null;
}): TemplateVariables {
  const firstName = input.employee.first_name?.trim() || "there";
  const lastName = input.employee.last_name?.trim() || "";
  const companyLegal = input.company?.companylegalname?.trim() || "";
  const companyTrading = input.company?.companytradingname?.trim() || "";
  const companyName = companyTrading || companyLegal || input.settings?.from_name?.trim() || "Kan Printers";

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
  };
}
