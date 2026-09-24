import type { MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const BANK_PROFILE_KEYS = new Set<keyof MockEmployee>([
  "bankName",
  "bankAccountHolder",
  "accountNumber",
  "branchCode",
]);

/** related_field values (camel or snake) that cash-paid employees do not need. */
export const CASH_OPTIONAL_TODO_RELATED_FIELDS = new Set([
  "taxReferenceNumber",
  "tax_reference_number",
  "uifNumber",
  "uif_number",
  "bankName",
  "bank_name",
  "bankAccountHolder",
  "bank_account_holder",
  "accountNumber",
  "iban_number",
  "branchCode",
  "routing_swift_code",
]);

/** True when the employee is paid in cash (no bank transfer). */
export function isCashPaid(
  employee: Pick<MockEmployee, "paymentMode"> | null | undefined
): boolean {
  return employee?.paymentMode === "Cash";
}

/**
 * Whether PAYE/UIF should be calculated and included in tax totals.
 * Cash-paid employees default to tracking tax (trackTax !== false).
 * Non-cash employees always track tax when company PAYE settings apply.
 */
export function shouldTrackEmployeeTax(
  employee: Pick<MockEmployee, "paymentMode" | "trackTax"> | null | undefined
): boolean {
  if (!employee) return true;
  if (isCashPaid(employee)) {
    return employee.trackTax !== false;
  }
  return true;
}

/** Cash-paid employees do not need a SARS tax reference number on file. */
export function requiresEmployeeTaxReference(
  employee: Pick<MockEmployee, "paymentMode"> | null | undefined
): boolean {
  return !isCashPaid(employee);
}

/** Cash-paid employees do not need bank account details. */
export function requiresEmployeeBankDetails(
  employee: Pick<MockEmployee, "paymentMode"> | null | undefined
): boolean {
  return !isCashPaid(employee);
}

/** Used by profile readiness / to-dos so cash employees skip bank + tax-ref checks. */
export function isProfileFieldApplicable(
  employee: MockEmployee,
  fieldKey: keyof MockEmployee
): boolean {
  if (BANK_PROFILE_KEYS.has(fieldKey) && !requiresEmployeeBankDetails(employee)) {
    return false;
  }
  if (fieldKey === "taxReferenceNumber" && !requiresEmployeeTaxReference(employee)) {
    return false;
  }
  return true;
}

/**
 * Stale profile to-dos for cash-paid employees (tax ref / UIF / bank).
 * Match on related_field or message text from older generators.
 */
export function isObsoleteCashProfileTodo(
  todo: { employeeId?: string | null; relatedField?: string | null; message?: string },
  employee: Pick<MockEmployee, "paymentMode"> | null | undefined
): boolean {
  if (!todo.employeeId || !isCashPaid(employee)) return false;

  const related = (todo.relatedField || "").trim();
  if (related && CASH_OPTIONAL_TODO_RELATED_FIELDS.has(related)) return true;

  const message = (todo.message || "").toLowerCase();
  if (!message) return false;
  return (
    message.includes("tax reference") ||
    message.includes("uif number") ||
    message.includes("missing uif") ||
    message.includes("bank name") ||
    message.includes("bank account") ||
    message.includes("branch code") ||
    message.includes("account number")
  );
}

/**
 * Split payslips for audit-style reports:
 * - display: non-cash employees (shown in lists / paid counts)
 * - tax: everyone who should contribute to PAYE/UIF totals (incl. cash with track tax)
 */
export function partitionPayslipsForReports(
  payslips: MockPayslip[],
  employees: MockEmployee[]
): { displayPayslips: MockPayslip[]; taxPayslips: MockPayslip[] } {
  const byId = new Map(employees.map((e) => [e.id, e]));

  const displayPayslips = payslips.filter((p) => {
    const emp = byId.get(p.employeeId);
    return !isCashPaid(emp);
  });

  const taxPayslips = payslips.filter((p) => {
    const emp = byId.get(p.employeeId);
    return shouldTrackEmployeeTax(emp);
  });

  return { displayPayslips, taxPayslips };
}

const STATUTORY_TAX_DEDUCTION_NAMES = new Set(["PAYE", "UIF"]);

/** Sum PAYE/UIF from tax payslips; other deduction names from display payslips. */
export function aggregateDeductionTotalsForReport(
  displayPayslips: MockPayslip[],
  taxPayslips: MockPayslip[]
): Record<string, number> {
  const totals: Record<string, number> = {};

  displayPayslips.forEach((p) => {
    (p.deductionsBreakdown || []).forEach((d) => {
      const key = (d?.name || "Unknown").trim();
      if (STATUTORY_TAX_DEDUCTION_NAMES.has(key)) return;
      totals[key] = (totals[key] || 0) + Number(d?.amount || 0);
    });
  });

  taxPayslips.forEach((p) => {
    (p.deductionsBreakdown || []).forEach((d) => {
      const key = (d?.name || "Unknown").trim();
      if (!STATUTORY_TAX_DEDUCTION_NAMES.has(key)) return;
      totals[key] = (totals[key] || 0) + Number(d?.amount || 0);
    });
  });

  return totals;
}
