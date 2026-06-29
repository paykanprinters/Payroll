import type {
  CompanyDebitAccount,
  PaymentBatchValidationResult,
  PaymentExportItem,
  ValidationIssue,
} from "./types";

const BRANCH_RE = /^\d{6}$/;
const ACCOUNT_RE = /^\d{6,20}$/;

export function normalizeDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function validateBranchCode(branch: string | null | undefined): boolean {
  return BRANCH_RE.test(normalizeDigits(branch));
}

export function validateAccountNumber(account: string | null | undefined): boolean {
  return ACCOUNT_RE.test(normalizeDigits(account));
}

function issue(
  severity: ValidationIssue["severity"],
  message: string,
  extra?: Partial<ValidationIssue>
): ValidationIssue {
  return { severity, message, ...extra };
}

/**
 * Validates a payment batch before generating a Bankserv (ACB) upload file.
 * Errors block export; warnings are informational.
 */
export function validatePaymentBatchForExport(
  items: PaymentExportItem[],
  company: CompanyDebitAccount | null | undefined
): PaymentBatchValidationResult {
  const issues: ValidationIssue[] = [];

  if (!items.length) {
    issues.push(issue("error", "No payment items in this batch."));
    return { valid: false, issues, exportableItems: [], totalExportAmount: 0 };
  }

  const companyBranch = normalizeDigits(company?.branchCode);
  const companyAccount = normalizeDigits(company?.accountNumber);

  if (!company?.branchCode || !company?.accountNumber) {
    issues.push(
      issue("error", "Company banking details are missing. Configure them under Settings → Company Details.")
    );
  } else {
    if (!validateBranchCode(companyBranch)) {
      issues.push(issue("error", "Company branch code must be 6 digits.", { field: "branchCode" }));
    }
    if (!validateAccountNumber(companyAccount)) {
      issues.push(
        issue("error", "Company account number must be 6–20 digits.", { field: "accountNumber" })
      );
    }
  }

  const exportableItems: PaymentExportItem[] = [];
  let totalExportAmount = 0;

  for (const item of items) {
    const label = item.employeeName || item.employeeId;
    const amount = Number(item.netPay);

    if (item.status === "Failed" || item.status === "Returned") {
      issues.push(
        issue("warning", `${label}: skipped (${item.status.toLowerCase()}).`, {
          itemId: item.id,
          employeeId: item.employeeId,
        })
      );
      continue;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      issues.push(
        issue("error", `${label}: net pay must be greater than zero.`, {
          itemId: item.id,
          employeeId: item.employeeId,
          field: "netPay",
        })
      );
      continue;
    }

    const branch = normalizeDigits(item.branchCode);
    const account = normalizeDigits(item.accountNumber);

    if (!branch || !account) {
      issues.push(
        issue("error", `${label}: missing bank account or branch code.`, {
          itemId: item.id,
          employeeId: item.employeeId,
          field: "bankDetails",
        })
      );
      continue;
    }

    if (!validateBranchCode(branch)) {
      issues.push(
        issue("error", `${label}: branch code must be 6 digits (got "${item.branchCode}").`, {
          itemId: item.id,
          employeeId: item.employeeId,
          field: "branchCode",
        })
      );
      continue;
    }

    if (!validateAccountNumber(account)) {
      issues.push(
        issue("error", `${label}: account number must be 6–20 digits.`, {
          itemId: item.id,
          employeeId: item.employeeId,
          field: "accountNumber",
        })
      );
      continue;
    }

    if (!item.accountHolder?.trim()) {
      issues.push(
        issue("warning", `${label}: account holder name is blank.`, {
          itemId: item.id,
          employeeId: item.employeeId,
          field: "accountHolder",
        })
      );
    }

    exportableItems.push(item);
    totalExportAmount += amount;
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  if (exportableItems.length === 0 && !hasErrors) {
    issues.push(issue("error", "No exportable payment items remain after validation."));
  }

  return {
    valid: !hasErrors && exportableItems.length > 0,
    issues,
    exportableItems,
    totalExportAmount,
  };
}
