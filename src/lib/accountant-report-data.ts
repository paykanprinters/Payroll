import type { Loan, SavingPlan } from "@/lib/mock-data-interfaces";
import type { PayrollRun } from "@/integrations/supabase/payroll-run-queries";

export type JournalLineId =
  | "salariesExpense"
  | "employerUifExpense"
  | "sdlExpense"
  | "payePayable"
  | "uifPayable"
  | "sdlPayable"
  | "staffLoans"
  | "staffSavings"
  | "otherDeductionsPayable"
  | "netPayPayable";

export interface JournalAccount {
  code: string;
  name: string;
}

export type JournalAccountCodes = Record<JournalLineId, JournalAccount>;

export const JOURNAL_LINE_ORDER: JournalLineId[] = [
  "salariesExpense",
  "employerUifExpense",
  "sdlExpense",
  "payePayable",
  "uifPayable",
  "sdlPayable",
  "staffLoans",
  "staffSavings",
  "otherDeductionsPayable",
  "netPayPayable",
];

export const DEFAULT_JOURNAL_ACCOUNTS: JournalAccountCodes = {
  salariesExpense: { code: "", name: "Salaries and wages" },
  employerUifExpense: { code: "", name: "UIF – employer contribution" },
  sdlExpense: { code: "", name: "Skills development levy" },
  payePayable: { code: "", name: "PAYE payable (SARS)" },
  uifPayable: { code: "", name: "UIF payable (SARS)" },
  sdlPayable: { code: "", name: "SDL payable (SARS)" },
  staffLoans: { code: "", name: "Staff loans receivable" },
  staffSavings: { code: "", name: "Staff savings held" },
  otherDeductionsPayable: { code: "", name: "Other payroll deductions payable" },
  netPayPayable: { code: "", name: "Net salaries payable" },
};

export function mergeJournalAccounts(saved: unknown): JournalAccountCodes {
  const merged = { ...DEFAULT_JOURNAL_ACCOUNTS };
  if (!saved || typeof saved !== "object") return merged;
  for (const id of JOURNAL_LINE_ORDER) {
    const row = (saved as Record<string, unknown>)[id];
    if (row && typeof row === "object") {
      const { code, name } = row as Partial<JournalAccount>;
      merged[id] = {
        code: typeof code === "string" ? code : merged[id].code,
        name: typeof name === "string" && name.trim() ? name : merged[id].name,
      };
    }
  }
  return merged;
}

export interface AccessListUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string | null;
  accessExpiresAt: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export interface AccountantExtraData {
  loans: Loan[];
  savingPlans: SavingPlan[];
  payrollRuns: PayrollRun[];
  users: AccessListUser[];
  journalAccounts: JournalAccountCodes;
}
