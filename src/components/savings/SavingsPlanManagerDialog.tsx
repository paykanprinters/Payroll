"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SavingPlan } from "@/lib/mock-data-interfaces";
import { PayrollSavingsEntry, statusColorMap, updateStatusClient } from "@/lib/savings-types";
import { ensureEntryForPlan, getEntryByPlanId, pauseEntry, recordPayment, setOverrideAmount, unpauseEntry } from "@/integrations/supabase/payroll-savings-entries";
import { showError, showSuccess } from "@/utils/toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: SavingPlan | null;
  employeeName: string;
}

const SavingsPlanManagerDialog: React.FC<Props> = ({ open, onOpenChange, plan, employeeName }) => {
  const [entry, setEntry] = useState<PayrollSavingsEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const [overrideAmount, setOverrideAmountState] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [pauseReason, setPauseReason] = useState<string>("");
  const [nextPaymentDate, setNextPaymentDate] = useState<string>("");

  useEffect(() => {
    if (!open || !plan) return;
    setLoading(true);
    (async () => {
      // Ensure an entry exists for this plan
      const ensured = await ensureEntryForPlan({
        id: plan.id,
        employeeId: plan.employeeId,
        amount: plan.amount,
      });
      if (!ensured) {
        setLoading(false);
        showError("Could not initialize savings entry for this plan.");
        return;
      }
      // Get fresh copy
      const latest = await getEntryByPlanId(plan.id);
      if (latest) {
        // Apply optional auto-unpause in UI view
        const tmp = { ...latest };
        updateStatusClient(tmp);
        setEntry(tmp);
        setOverrideAmountState(tmp.overrideAmount != null ? String(tmp.overrideAmount) : "");
        setPauseReason(tmp.pauseReason ?? "");
        setNextPaymentDate(tmp.nextPaymentDate ?? "");
      }
      setLoading(false);
    })();
  }, [open, plan]);

  const statusBadge = useMemo(() => {
    if (!entry) return null;
    const cls = statusColorMap[entry.status];
    return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{entry.status}</span>;
  }, [entry]);

  const handleSaveOverride = async () => {
    if (!plan || entry == null) return;
    const amt = overrideAmount.trim() === "" ? null : Number(overrideAmount);
    if (amt != null && (isNaN(amt) || amt < 0)) {
      showError("Override amount must be a non-negative number.");
      return;
    }
    const updated = await setOverrideAmount(plan.id, amt);
    if (updated) {
      setEntry(updated);
      showSuccess("Override amount saved.");
    }
  };

  const handleRecordPayment = async () => {
    if (!plan || entry == null) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showError("Enter a payment amount greater than 0.");
      return;
    }
    const updated = await recordPayment(plan.id, amt);
    if (updated) {
      setEntry(updated);
      setPaymentAmount("");
      showSuccess("Payment recorded.");
    }
  };

  const handlePause = async () => {
    if (!plan || entry == null) return;
    const updated = await pauseEntry(plan.id, pauseReason || null, nextPaymentDate || null);
    if (updated) {
      setEntry(updated);
      showSuccess("Savings plan paused.");
    }
  };

  const handleUnpause = async () => {
    if (!plan || entry == null) return;
    const updated = await unpauseEntry(plan.id);
    if (updated) {
      setEntry(updated);
      showSuccess("Savings plan unpaused.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Manage Savings Plan</DialogTitle>
          <DialogDescription>
            {plan ? `Employee: ${employeeName} • Plan ${plan.id}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!plan || loading || !entry ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Status</div>
                {statusBadge}
              </div>
              <div className="text-right text-sm">
                <div>Original: R {entry.originalAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
                <div>Override: {entry.overrideAmount != null ? `R ${entry.overrideAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : "None"}</div>
                <div>Paid: R {entry.amountPaid.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
                <div>Remaining: R {entry.remainingBalance.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="overrideAmount">Override Amount (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="overrideAmount"
                  type="number"
                  step="0.01"
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmountState(e.target.value)}
                />
                <Button onClick={handleSaveOverride}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">If provided, override replaces the original amount for repayment and status logic.</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="paymentAmount">Record Payment</Label>
              <div className="flex gap-2">
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                <Button onClick={handleRecordPayment}>Record</Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pause Handling</Label>
                {entry.paused ? (
                  <Button variant="secondary" onClick={handleUnpause}>Unpause</Button>
                ) : (
                  <Button variant="secondary" onClick={handlePause}>Pause</Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nextPaymentDate">Next Payment Date (optional)</Label>
                  <Input
                    id="nextPaymentDate"
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pauseReason">Pause Reason (optional)</Label>
                  <Input
                    id="pauseReason"
                    type="text"
                    maxLength={255}
                    placeholder="Reason..."
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                When paused, status remains Paused. It may auto-unpause when the next payment date is reached.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SavingsPlanManagerDialog;