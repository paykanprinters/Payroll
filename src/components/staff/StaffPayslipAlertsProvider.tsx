"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ReceiptText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useStaffPortalContext } from "@/hooks/use-staff-portal-context";
import { StaffPayslipAlertsContext } from "@/context/staff-payslip-alerts-state";
import type { MockPayslip } from "@/lib/mock-data-interfaces";
import { staffPortalPath } from "@/lib/staff-portal";

const DISMISSED_STORAGE_KEY = "staff-payslip-popup-dismissed";

function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Private mode / storage disabled: the pop-up may reappear this session.
  }
}

const StaffPayslipAlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { employee } = useStaffPortalContext();
  const { payslips } = usePayrollProcessor();
  const navigate = useNavigate();
  const location = useLocation();

  const [seenIds, setSeenIds] = useState<Set<string> | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissed);

  const myPayslips = useMemo(
    () =>
      payslips
        .filter((p) => p.employeeId === employee.id)
        .sort((a, b) => b.payPeriod.localeCompare(a.payPeriod)),
    [payslips, employee.id]
  );
  const payslipIdsKey = useMemo(() => myPayslips.map((p) => p.id).join(","), [myPayslips]);

  useEffect(() => {
    if (!payslipIdsKey) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("payslip_views")
        .select("payslip_id")
        .eq("employee_id", employee.id);
      if (cancelled) return;
      if (error) {
        console.warn("Could not load payslip view history", error.message);
        return;
      }
      setSeenIds((prev) => {
        const next = new Set((data ?? []).map((r: { payslip_id: string }) => r.payslip_id));
        prev?.forEach((id) => next.add(id));
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [employee.id, payslipIdsKey]);

  const unseenPayslips = useMemo(
    () => (seenIds ? myPayslips.filter((p) => !seenIds.has(p.id)) : []),
    [myPayslips, seenIds]
  );

  const isUnseen = useCallback(
    (payslipId: string) => unseenPayslips.some((p) => p.id === payslipId),
    [unseenPayslips]
  );

  const markSeen = useCallback(
    (payslip: MockPayslip) => {
      if (!seenIds || seenIds.has(payslip.id)) return;
      setSeenIds((prev) => new Set(prev).add(payslip.id));
      void supabase
        .from("payslip_views")
        .upsert(
          { payslip_id: payslip.id, employee_id: payslip.employeeId },
          { onConflict: "payslip_id", ignoreDuplicates: true }
        )
        .then(({ error }) => {
          if (error) console.warn("Could not record payslip view", error.message);
        });
    },
    [seenIds]
  );

  const onPayslipsPage = location.pathname.startsWith(staffPortalPath("payslips"));
  const popupPayslip = onPayslipsPage
    ? undefined
    : unseenPayslips.find((p) => !dismissedIds.has(p.id));

  const dismiss = useCallback(() => {
    if (!popupPayslip) return;
    setDismissedIds((prev) => {
      const next = new Set(prev).add(popupPayslip.id);
      writeDismissed(next);
      return next;
    });
  }, [popupPayslip]);

  const viewPayslip = () => {
    if (!popupPayslip) return;
    navigate(`${staffPortalPath("payslips")}?id=${encodeURIComponent(popupPayslip.id)}`);
  };

  const value = useMemo(
    () => ({ unseenPayslips, isUnseen, markSeen }),
    [unseenPayslips, isUnseen, markSeen]
  );

  return (
    <StaffPayslipAlertsContext.Provider value={value}>
      {children}
      <Dialog open={!!popupPayslip} onOpenChange={(open) => !open && dismiss()}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
              <ReceiptText className="h-6 w-6 text-cyan-700" />
            </div>
            <DialogTitle>New payslip available</DialogTitle>
            <DialogDescription>
              Your payslip for <span className="font-medium text-slate-900">{popupPayslip?.payPeriod}</span>{" "}
              is ready to view.
              {unseenPayslips.length > 1 && ` You have ${unseenPayslips.length} unread payslips.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" onClick={dismiss}>
              Later
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={viewPayslip}>
              View payslip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffPayslipAlertsContext.Provider>
  );
};

export default StaffPayslipAlertsProvider;
