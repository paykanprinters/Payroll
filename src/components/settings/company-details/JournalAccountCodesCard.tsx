"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/utils/toast";
import { recordSettingsChange } from "@/lib/audit-trail";
import {
  DEFAULT_JOURNAL_ACCOUNTS,
  JOURNAL_LINE_ORDER,
  mergeJournalAccounts,
  type JournalAccountCodes,
  type JournalLineId,
} from "@/lib/accountant-report-data";

const SIDE: Record<JournalLineId, "Debit" | "Credit"> = {
  salariesExpense: "Debit",
  employerUifExpense: "Debit",
  sdlExpense: "Debit",
  payePayable: "Credit",
  uifPayable: "Credit",
  sdlPayable: "Credit",
  staffLoans: "Credit",
  staffSavings: "Credit",
  otherDeductionsPayable: "Credit",
  netPayPayable: "Credit",
};

const JournalAccountCodesCard: React.FC<{ canEdit: boolean; isMockDataEnabled: boolean }> = ({
  canEdit,
  isMockDataEnabled,
}) => {
  const [rowId, setRowId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<JournalAccountCodes>(DEFAULT_JOURNAL_ACCOUNTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isMockDataEnabled) {
      setIsLoading(false);
      return;
    }
    void (async () => {
      const { data } = await supabase.from("company_details").select("id, journal_account_codes").limit(1);
      setRowId((data?.[0]?.id as string | undefined) ?? null);
      setAccounts(mergeJournalAccounts(data?.[0]?.journal_account_codes));
      setIsLoading(false);
    })();
  }, [isMockDataEnabled]);

  const update = (id: JournalLineId, field: "code" | "name", value: string) =>
    setAccounts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const save = async () => {
    if (!rowId) {
      showError("Save the company details first.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("company_details")
      .update({ journal_account_codes: accounts })
      .eq("id", rowId);
    setIsSaving(false);
    if (error) {
      showError("Failed to save journal account codes.");
      return;
    }
    showSuccess("Journal account codes saved.");
    void recordSettingsChange("journal_account_codes", "Payroll journal account codes updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll journal account codes</CardTitle>
        <CardDescription>
          The ledger accounts the payroll journal report posts to. Use the codes from your accounting
          system (for example Sage, Xero or Pastel) so the accountant can import the journal directly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="hidden grid-cols-[5rem_8rem_1fr] gap-3 text-xs font-medium text-muted-foreground sm:grid">
              <span>Side</span>
              <span>Account code</span>
              <span>Account name</span>
            </div>
            {JOURNAL_LINE_ORDER.map((id) => (
              <div key={id} className="grid grid-cols-[5rem_8rem_1fr] items-center gap-3">
                <span className="text-xs text-muted-foreground">{SIDE[id]}</span>
                <Input
                  value={accounts[id].code}
                  onChange={(e) => update(id, "code", e.target.value)}
                  placeholder="e.g. 4000"
                  disabled={!canEdit}
                  aria-label={`${accounts[id].name} account code`}
                />
                <Input
                  value={accounts[id].name}
                  onChange={(e) => update(id, "name", e.target.value)}
                  disabled={!canEdit}
                  aria-label={`${DEFAULT_JOURNAL_ACCOUNTS[id].name} account name`}
                />
              </div>
            ))}
            <Button
              type="button"
              className="w-full"
              onClick={() => void save()}
              disabled={!canEdit || isSaving || isMockDataEnabled}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save account codes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JournalAccountCodesCard;
