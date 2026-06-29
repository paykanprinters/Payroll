import { format } from "date-fns";
import type { BankAccountType, BankservAcbOptions, CompanyDebitAccount, PaymentExportItem } from "./types";
import { normalizeDigits } from "./validate-payment-batch";

const RECORD_BODY_LEN = 180;
const CRLF = "\r\n";

/** Bankserv account-type codes (field 47). */
export function mapAccountTypeCode(type?: BankAccountType | null): "1" | "2" | "3" {
  const t = (type ?? "").toLowerCase();
  if (t.includes("saving")) return "2";
  if (t.includes("transmission") || t.includes("business")) return "3";
  return "1"; // Cheque / current (default for payroll)
}

function num(value: string | number, length: number): string {
  const raw = String(value).replace(/\D/g, "");
  if (raw.length > length) {
    return raw.slice(-length);
  }
  return raw.padStart(length, "0");
}

function alpha(value: string, length: number): string {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .trim();
  if (cleaned.length >= length) return cleaned.slice(0, length);
  return cleaned.padEnd(length, " ");
}

function zeros(length: number): string {
  return "0".repeat(length);
}

function spaces(length: number): string {
  return " ".repeat(length);
}

function buildRecord(body: string): string {
  if (body.length !== RECORD_BODY_LEN) {
    throw new Error(`ACB record length ${body.length}, expected ${RECORD_BODY_LEN}`);
  }
  return body + CRLF;
}

function splitToAccount(accountDigits: string): { standard: string; nonStandard: string } {
  if (accountDigits.length <= 11) {
    return { standard: num(accountDigits, 11), nonStandard: zeros(20) };
  }
  return { standard: zeros(11), nonStandard: num(accountDigits, 20) };
}

function actionDateYYMMDD(date: Date): string {
  return format(date, "yyMMdd");
}

function hashTotalHomingAccounts(items: PaymentExportItem[]): string {
  const sum = items.reduce((acc, item) => {
    const acct = normalizeDigits(item.accountNumber);
    const use = acct.length <= 11 ? acct : acct.slice(-11);
    return acc + Number(use || 0);
  }, 0);
  return num(String(sum), 12);
}

function installationHeader(): string {
  return buildRecord("02" + zeros(178));
}

function userHeader(): string {
  return buildRecord("04" + zeros(178));
}

function installationTrailer(): string {
  return buildRecord("94" + zeros(178));
}

function userTrailer(items: PaymentExportItem[]): string {
  const hash = hashTotalHomingAccounts(items);
  return buildRecord("92" + spaces(70) + hash + spaces(96));
}

function contraRecord(
  company: CompanyDebitAccount,
  actionDate: Date,
  contraId: "12" | "22"
): string {
  const branch = num(normalizeDigits(company.branchCode), 6);
  const account = num(normalizeDigits(company.accountNumber), 11);
  const date = actionDateYYMMDD(actionDate);
  return buildRecord(contraId + branch + account + zeros(39) + date + spaces(116));
}

function transactionRecord(
  company: CompanyDebitAccount,
  item: PaymentExportItem,
  sequence: number,
  options: Required<Pick<BankservAcbOptions, "actionDate" | "toReference" | "fromReference" | "transactionRecordId">>
): string {
  const recordId = options.transactionRecordId;
  const fromBranch = num(normalizeDigits(company.branchCode), 6);
  const fromAccount = num(normalizeDigits(company.accountNumber), 11);
  const seq = num(sequence, 10);
  const toBranch = num(normalizeDigits(item.branchCode), 6);
  const toDigits = normalizeDigits(item.accountNumber);
  const { standard: toAccount, nonStandard } = splitToAccount(toDigits);
  const accountType = mapAccountTypeCode(item.bankAccountType);
  const amountCents = num(Math.round(Number(item.netPay) * 100), 11);
  const date = actionDateYYMMDD(options.actionDate);

  const toRef = alpha(
    options.toReference || item.accountHolder || "SALARY",
    20
  );
  const fromRef = alpha(options.fromReference || "PAYROLL", 15);

  const body =
    recordId +
    fromBranch +
    fromAccount +
    seq +
    toBranch +
    toAccount +
    accountType +
    amountCents +
    date +
    zeros(6) +
    toRef +
    zeros(10) +
    fromRef +
    spaces(15) +
    nonStandard +
    spaces(30);

  return buildRecord(body);
}

export interface GenerateBankservAcbInput {
  company: CompanyDebitAccount;
  items: PaymentExportItem[];
  options?: BankservAcbOptions;
}

/**
 * Builds a Bankserv (ACB) fixed-width payment file accepted by Absa Business Online,
 * FNB, Nedbank and Standard Bank bulk-payment imports (181 chars/record incl. CRLF).
 */
export function generateBankservAcbFile(input: GenerateBankservAcbInput): string {
  const { company, items } = input;
  const options: Required<Pick<BankservAcbOptions, "actionDate" | "toReference" | "fromReference" | "transactionRecordId">> = {
    actionDate: input.options?.actionDate ?? new Date(),
    toReference: input.options?.toReference ?? "SALARY",
    fromReference: input.options?.fromReference ?? "PAYROLL",
    transactionRecordId: input.options?.transactionRecordId ?? "10",
  };

  const contraId = options.transactionRecordId === "10" ? "12" : "22";
  const lines: string[] = [];

  lines.push(installationHeader());
  lines.push(userHeader());

  items.forEach((item, index) => {
    lines.push(transactionRecord(company, item, index + 1, options));
  });

  lines.push(contraRecord(company, options.actionDate, contraId));
  lines.push(userTrailer(items));
  lines.push(installationTrailer());

  return lines.join("");
}

/** Each logical record is 180 data chars + CRLF (181 bytes per line). */
export function countAcbRecords(fileContent: string): number {
  return fileContent.split(CRLF).filter((line) => line.length > 0).length;
}
