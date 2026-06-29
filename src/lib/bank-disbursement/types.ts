export type BankAccountType = "Cheque" | "Savings" | "Business" | string;

export interface PaymentExportItem {
  id: string;
  employeeId: string;
  employeeName?: string;
  netPay: number;
  accountHolder?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
  bankAccountType?: BankAccountType | null;
  status: string;
}

export interface CompanyDebitAccount {
  branchCode: string;
  accountNumber: string;
  accountHolder?: string;
  accountType?: BankAccountType | null;
  bankName?: string;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  itemId?: string;
  employeeId?: string;
  field?: string;
  message: string;
}

export interface PaymentBatchValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Items eligible for bank-file export (excludes failed/returned and zero-pay). */
  exportableItems: PaymentExportItem[];
  totalExportAmount: number;
}

export interface BankservAcbOptions {
  actionDate: Date;
  /** Shown on beneficiary statements (max 20 chars). */
  toReference?: string;
  /** Shown on employer debit statement (max 15 chars). */
  fromReference?: string;
  /** Record 10 for credits; Absa and most SA banks accept this for salary payments. */
  transactionRecordId?: "10" | "20";
}
