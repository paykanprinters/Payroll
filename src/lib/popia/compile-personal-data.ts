import { MockEmployee } from "@/lib/mock-data-interfaces";

export interface PersonalDataSection {
  key: string;
  label: string;
  /** Count of records in this section. */
  count: number;
  records: Record<string, unknown>[];
}

export interface PersonalDataExport {
  generatedAt: string;
  subject: {
    employeeId: string;
    employeeNumber?: string;
    fullName: string;
    email?: string;
  };
  profile: Record<string, unknown>;
  sections: PersonalDataSection[];
  note: string;
}

export interface CompilePersonalDataInput {
  employee: MockEmployee;
  payslips?: Record<string, unknown>[];
  timesheets?: Record<string, unknown>[];
  leave?: Record<string, unknown>[];
  loans?: Record<string, unknown>[];
  savings?: Record<string, unknown>[];
  consents?: Record<string, unknown>[];
  notifications?: Record<string, unknown>[];
  generatedAt?: Date;
}

const EXPORT_NOTE =
  "This file contains the personal information held about the data subject in the payroll system, " +
  "compiled in response to a POPIA access request. Statutory records may be retained even after an " +
  "erasure request, in line with legal retention requirements.";

/**
 * Pure assembler that turns fetched datasets into a structured, portable
 * "right of access" (DSAR) export. No I/O — fetching and download happen in the
 * query/UI layers so this stays unit-testable.
 */
export function compilePersonalDataExport(input: CompilePersonalDataInput): PersonalDataExport {
  const { employee } = input;
  const generatedAt = (input.generatedAt ?? new Date()).toISOString();

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || "Unknown";

  const sections: PersonalDataSection[] = [
    { key: "payslips", label: "Payslips", records: input.payslips ?? [] },
    { key: "timesheets", label: "Timesheets", records: input.timesheets ?? [] },
    { key: "leave", label: "Leave records", records: input.leave ?? [] },
    { key: "loans", label: "Loans", records: input.loans ?? [] },
    { key: "savings", label: "Savings plans", records: input.savings ?? [] },
    { key: "consents", label: "Consent records", records: input.consents ?? [] },
    { key: "notifications", label: "Notification history", records: input.notifications ?? [] },
  ].map((s) => ({ ...s, count: s.records.length }));

  return {
    generatedAt,
    subject: {
      employeeId: employee.id,
      employeeNumber: employee.customEmployeeId,
      fullName,
      email: employee.email,
    },
    profile: { ...(employee as unknown as Record<string, unknown>) },
    sections,
    note: EXPORT_NOTE,
  };
}

/** Total number of related records across all sections (excludes the profile). */
export function countExportRecords(exp: PersonalDataExport): number {
  return exp.sections.reduce((sum, s) => sum + s.count, 0);
}
