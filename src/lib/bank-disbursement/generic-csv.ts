import type { PaymentExportItem } from "./types";

/** Generic CSV for manual review or non-ACB workflows. */
export function generateGenericPaymentCsv(items: PaymentExportItem[]): string {
  const headers = [
    "employee_id",
    "employee_name",
    "account_holder",
    "branch_code",
    "account_number",
    "amount",
    "bank_name",
  ];
  const lines = [headers.join(",")];
  items.forEach((it) => {
    const row = [
      it.employeeId,
      `"${(it.employeeName || "").replace(/"/g, '""')}"`,
      `"${(it.accountHolder || "").replace(/"/g, '""')}"`,
      (it.branchCode || "").replace(/,/g, ""),
      (it.accountNumber || "").replace(/,/g, ""),
      Number(it.netPay).toFixed(2),
      `"${(it.bankName || "").replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(","));
  });
  return lines.join("\n");
}
