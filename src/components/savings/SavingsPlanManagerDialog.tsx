"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SavingPlan } from "@/lib/mock-data-interfaces";
import { PayrollSavingsEntry, SavingsPayment, statusColorMap, updateStatusClient } from "@/lib/savings-types";
import {
  ensureEntryForPlan,
  getEntryByPlanId,
  listPaymentsForPlan,
  pauseEntry,
  recordPayment,
  setGoalAmount,
  setOverrideAmount,
  syncDeductionAmount,
  unpauseEntry,
} from "@/integrations/supabase/payroll-savings-entries";
import { showError, showSuccess } from "@/utils/toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: SavingPlan | null;
  employeeName: string;
  onUpdatePlan: (plan: SavingPlan) => Promise<boolean>;
}

const money = (value: number) => `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;

const SavingsPlanManagerDialog: React.FC<Props> = ({ open, onOpenChange, plan, employeeName, onUpdatePlan }) => {
  const [entry, setEntry] = useState<PayrollSavingsEntry | null>(null);
  const [payments, setPayments] = useState<SavingsPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const [deductionAmount, setDeductionAmount] = useState("");
  const [frequency, setFrequency] = useState<SavingPlan["frequency"]>("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [planStatus, setPlanStatus] = useState<SavingPlan["status"]>("active");

  const [goalAmount, setGoalAmountState] = useState("");
  const [overrideAmount, setOverrideAmountState] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentPeriod, setPaymentPeriod] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");

  useEffect(() => {
    if (!open || !plan) return;
    setDeductionAmount(String(plan.amount));
    setFrequency(plan.frequency);
    setStartDate(plan.startDate.slice(0, 10));
    setEndDate(plan.endDate ? plan.endDate.slice(0, 10) : "");
    setPlanStatus(plan.status);
    setPaymentAmount("");
    setPaymentPeriod("");
    setLoading(true);
    (async () => {
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
      const [latest, history] = await Promise.all([
        getEntryByPlanId(plan.id),
        listPaymentsForPlan(plan.id),
      ]);
      if (latest) {
        const tmp = { ...latest };
        updateStatusClient(tmp);
        setEntry(tmp);
        setGoalAmountState(tmp.goalAmount != null ? String(tmp.goalAmount) : "");
        setOverrideAmountState(tmp.overrideAmount != null ? String(tmp.overrideAmount) : "");
        setPauseReason(tmp.pauseReason ?? "");
        setNextPaymentDate(tmp.nextPaymentDate ?? "");
      }
      setPayments(history);
      setLoading(false);
    })();
  }, [open, plan]);

  const statusBadge = useMemo(() => {
    if (!entry) return null;
    const cls = statusColorMap[entry.status];
    return (
      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
        {entry.status}
      </span>
    );
  }, [entry]);

  const handleSavePlan = async () => {
    if (!plan) return;
    const amount = Number(deductionAmount);
    if (isNaN(amount) || amount <= 0) {
      showError("Deduction amount must be greater than zero.");
      return;
    }
    if (!startDate) {
      showError("A start date is required.");
      return;
    }
    if (endDate && endDate < startDate) {
      showError("The end date must be on or after the start date.");
      return;
    }
    const nextPlan: SavingPlan = {
      ...plan,
      amount,
      frequency,
      startDate,
      endDate: endDate || undefined,
      status: planStatus,
    };
    const saved = await onUpdatePlan(nextPlan);
    if (!saved) return;
    const updated = await syncDeductionAmount(plan.id, amount);
    if (updated) setEntry(updated);
  };

  const handleSaveGoal = async () => {
    if (!plan || entry == null) return;
    const amt = goalAmount.trim() === "" ? null : Number(goalAmount);
    if (amt != null && (isNaN(amt) || amt <= 0)) {
      showError("Savings goal must be greater than zero, or left blank.");
      return;
    }
    const updated = await setGoalAmount(plan.id, amt);
    if (updated) {
      setEntry(updated);
      showSuccess(amt == null ? "Savings goal cleared." : "Savings goal saved.");
    }
  };

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
      showSuccess("Deduction override saved.");
    }
  };

  const handleRecordPayment = async () => {
    if (!plan || entry == null) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showError("Enter a payment amount greater than 0.");
      return;
    }
    if (!paymentPeriod) {
      showError("Choose the pay period this amount belongs to.");
      return;
    }
    const updated = await recordPayment(plan.id, amt, paymentPeriod);
    if (updated) {
      setEntry(updated);
      setPaymentAmount("");
      setPayments(await listPaymentsForPlan(plan.id));
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
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-2 border-b px-6 py-5 text-left">
          <DialogTitle>Manage savings plan</DialogTitle>
          <DialogDescription>
            {plan
              ? `${employeeName} · ${plan.frequency} deduction of ${money(plan.amount)}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {!plan || loading || !entry ? (
          <div className="px-6 py-10 text-center text-muted-foreground">Loading plan details…</div>
        ) : (
          <div className="space-y-6 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Tracking status</div>
                {statusBadge}
                <p className="max-w-[240px] text-xs text-muted-foreground">
                  Pending until recorded payments reach the savings goal. With no goal, the deduction stays open.
                </p>
              </div>
              <div className="text-right text-sm">
                <div>Deduction: {money(plan.amount)}</div>
                <div>Override: {entry.overrideAmount != null ? money(entry.overrideAmount) : "None"}</div>
                <div>Goal: {entry.goalAmount != null ? money(entry.goalAmount) : "None"}</div>
                <div>Paid: {money(entry.amountPaid)}</div>
                <div>
                  Remaining:{" "}
                  {entry.goalAmount == null ? "No goal" : money(entry.remainingBalance ?? 0)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Plan schedule</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deductionAmount">Deduction amount (R)</Label>
                  <Input
                    id="deductionAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planFrequency">Frequency</Label>
                  <Select value={frequency} onValueChange={(value) => setFrequency(value as SavingPlan["frequency"])}>
                    <SelectTrigger id="planFrequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planStartDate">Start date</Label>
                  <Input id="planStartDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planEndDate">End date (optional)</Label>
                  <Input id="planEndDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planStatus">Plan status</Label>
                  <Select value={planStatus} onValueChange={(value) => setPlanStatus(value as SavingPlan["status"])}>
                    <SelectTrigger id="planStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" onClick={handleSavePlan}>Save plan</Button>
              <p className="text-xs text-muted-foreground">
                This is the amount payroll deducts each period. Completed plans stop being deducted.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="goalAmount">Savings goal (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="goalAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Total to save"
                  value={goalAmount}
                  onChange={(e) => setGoalAmountState(e.target.value)}
                />
                <Button type="button" onClick={handleSaveGoal}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank for an open-ended deduction. When payments reach this total, tracking becomes paid.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="overrideAmount">Deduction override (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="overrideAmount"
                  type="number"
                  step="0.01"
                  value={overrideAmount}
                  onChange={(e) => setOverrideAmountState(e.target.value)}
                />
                <Button type="button" onClick={handleSaveOverride}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Replaces the deduction on the payslip. It does not change the savings goal.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label htmlFor="paymentAmount">Record payment</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Amount (R)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentPeriod">Pay period</Label>
                  <Input
                    id="paymentPeriod"
                    type="date"
                    value={paymentPeriod}
                    onChange={(e) => setPaymentPeriod(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleRecordPayment}>Record</Button>
              </div>
              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex justify-between gap-3">
                      <span>{format(parseISO(payment.payPeriod), "dd MMM yyyy")}</span>
                      <span>{money(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pause handling</Label>
                {entry.paused ? (
                  <Button type="button" variant="secondary" onClick={handleUnpause}>Unpause</Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={handlePause}>Pause</Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nextPaymentDate">Next payment date (optional)</Label>
                  <Input
                    id="nextPaymentDate"
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pauseReason">Pause reason (optional)</Label>
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
                When paused, status remains paused. It may auto-unpause when the next payment date is reached.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SavingsPlanManagerDialog;
