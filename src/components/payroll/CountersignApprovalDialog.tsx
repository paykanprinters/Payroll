"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { parseFunctionError } from "@/lib/parse-function-error";
import { ShieldCheck } from "lucide-react";

type CountersignApprovalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
  periodLabel: string;
  onApproved: (approver: { id: string; name: string; approvedAt: string }) => void;
};

const CountersignApprovalDialog: React.FC<CountersignApprovalDialogProps> = ({
  open,
  onOpenChange,
  runId,
  periodLabel,
  onApproved,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    setEmail("");
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  const approve = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("approve-payroll-run", {
        body: { runId, email: email.trim(), password },
      });
      if (invokeError || !data?.ok) {
        setError(await parseFunctionError(invokeError, data));
        return;
      }
      const approverId = typeof data.approverId === "string" ? data.approverId : "";
      const approverName = typeof data.approverName === "string" ? data.approverName.trim() : "";
      const approvedAt = typeof data.approvedAt === "string" ? data.approvedAt : new Date().toISOString();
      if (!approverId || !approverName) {
        setError("This payroll run could not be approved.");
        return;
      }
      setEmail("");
      setPassword("");
      onOpenChange(false);
      onApproved({ id: approverId, name: approverName, approvedAt });
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Approve this payroll run
          </DialogTitle>
          <DialogDescription>
            You are about to approve the payroll run for {periodLabel}. Sign in with your own account
            below. The person already logged in on this computer stays signed in.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void approve(event)}>
          <div className="space-y-2">
            <Label htmlFor="countersign-email">Email address</Label>
            <Input
              id="countersign-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="countersign-password">Password</Label>
            <Input
              id="countersign-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !email.trim() || !password}>
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CountersignApprovalDialog;
