import { describe, expect, it } from "vitest";
import { generateBankservAcbFile, countAcbRecords, mapAccountTypeCode } from "@/lib/bank-disbursement/bankserv-acb";
import {
  validatePaymentBatchForExport,
  validateBranchCode,
  validateAccountNumber,
} from "@/lib/bank-disbursement/validate-payment-batch";
import type { PaymentExportItem } from "@/lib/bank-disbursement/types";

const company = {
  branchCode: "632005",
  accountNumber: "12345678901",
  accountHolder: "Kan Printers",
  accountType: "Cheque" as const,
};

const baseItem: PaymentExportItem = {
  id: "item-1",
  employeeId: "emp-1",
  employeeName: "Thandi Nkosi",
  netPay: 3728.68,
  accountHolder: "Thandi Nkosi",
  branchCode: "250655",
  accountNumber: "62011234567",
  bankAccountType: "Cheque",
  status: "Pending",
};

describe("validatePaymentBatchForExport", () => {
  it("flags missing company banking details", () => {
    const result = validatePaymentBatchForExport([baseItem], null);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Company banking"))).toBe(true);
  });

  it("passes a valid batch", () => {
    const result = validatePaymentBatchForExport([baseItem], company);
    expect(result.valid).toBe(true);
    expect(result.exportableItems).toHaveLength(1);
    expect(result.totalExportAmount).toBeCloseTo(3728.68);
  });

  it("rejects missing employee bank details", () => {
    const result = validatePaymentBatchForExport(
      [{ ...baseItem, accountNumber: null }],
      company
    );
    expect(result.valid).toBe(false);
  });

  it("skips failed items with a warning", () => {
    const result = validatePaymentBatchForExport(
      [{ ...baseItem, status: "Failed" }],
      company
    );
    expect(result.valid).toBe(false);
    expect(result.exportableItems).toHaveLength(0);
    expect(result.issues.some((i) => i.severity === "warning")).toBe(true);
  });
});

describe("validateBranchCode / validateAccountNumber", () => {
  it("accepts standard SA branch and account formats", () => {
    expect(validateBranchCode("632005")).toBe(true);
    expect(validateAccountNumber("62011234567")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(validateBranchCode("12345")).toBe(false);
    expect(validateAccountNumber("123")).toBe(false);
  });
});

describe("mapAccountTypeCode", () => {
  it("maps account types to Bankserv codes", () => {
    expect(mapAccountTypeCode("Savings")).toBe("2");
    expect(mapAccountTypeCode("Business")).toBe("3");
    expect(mapAccountTypeCode("Cheque")).toBe("1");
  });
});

describe("generateBankservAcbFile", () => {
  const actionDate = new Date("2026-06-29T12:00:00.000Z");

  it("produces the required header, transactions, contra and trailer records", () => {
    const file = generateBankservAcbFile({
      company,
      items: [baseItem],
      options: { actionDate, fromReference: "JUN PAYROLL", toReference: "SALARY" },
    });

    expect(countAcbRecords(file)).toBe(6); // 02, 04, 10, 12, 92, 94
    const lines = file.split("\r\n").filter(Boolean);
    expect(lines[0].startsWith("02")).toBe(true);
    expect(lines[1].startsWith("04")).toBe(true);
    expect(lines[2].startsWith("10")).toBe(true);
    expect(lines[2].slice(46, 47)).toBe("1"); // cheque
    expect(lines[2].slice(47, 58)).toBe("00000372868"); // amount in cents
    expect(lines[3].startsWith("12")).toBe(true);
    expect(lines[4].startsWith("92")).toBe(true);
    expect(lines[5].startsWith("94")).toBe(true);
    lines.forEach((line) => expect(line.length).toBe(180));
  });

  it("uses non-standard account field for long account numbers", () => {
    const longAcct = { ...baseItem, accountNumber: "12345678901234567890" };
    const file = generateBankservAcbFile({ company, items: [longAcct], options: { actionDate } });
    const txLine = file.split("\r\n")[2];
    expect(txLine.slice(35, 46)).toBe("00000000000"); // standard field zeroed
    expect(txLine.slice(130, 150)).not.toBe("0".repeat(20));
  });
});
