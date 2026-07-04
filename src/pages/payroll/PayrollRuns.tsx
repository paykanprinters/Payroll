"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { fetchPayrollRuns, createPayrollRun, PayrollRun } from "@/integrations/supabase/payroll-run-queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const runStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700 line-through";
    case "Paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Locked":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "";
  }
};

const PayrollRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // A period carried over from the dashboard "Go to Payroll Runs" button, if any.
  const carriedPeriod = location.state as
    | { periodStart?: string; periodEnd?: string }
    | null;
  const { isMockDataEnabled, payCycleSettings } = usePayrollProcessor({ silent: true });
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periodStart, setPeriodStart] = useState<string>(carriedPeriod?.periodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState<string>(carriedPeriod?.periodEnd ?? "");

  useEffect(() => {
    const load = async () => {
      const list = await fetchPayrollRuns();
      setRuns(list);
    };
    load();
  }, []);

  useEffect(() => {
    // If the user arrived from the dashboard with a specific period, keep it
    // instead of resetting to the current cycle window.
    if (carriedPeriod?.periodStart && carriedPeriod?.periodEnd) {
      return;
    }
    if (payCycleSettings) {
      // Default to current week/month window if available
      const today = new Date();
      const y = today.getFullYear();
      const m = (today.getMonth() + 1).toString().padStart(2, "0");
      if (payCycleSettings.payCycleType === "Monthly") {
        const start = `${y}-${m}-01`;
        const end = `${y}-${m}-${new Date(y, today.getMonth() + 1, 0)
          .getDate()
          .toString()
          .padStart(2, "0")}`;
        setPeriodStart(start);
        setPeriodEnd(end);
      } else {
        // Weekly or Bi-Weekly: default to Monday-Sunday of current week
        const day = today.getDay(); // 0 Sun ... 6 Sat
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const ms = monday.getMonth() + 1;
        const me = sunday.getMonth() + 1;
        setPeriodStart(
          `${monday.getFullYear()}-${ms.toString().padStart(2, "0")}-${monday
            .getDate()
            .toString()
            .padStart(2, "0")}`
        );
        setPeriodEnd(
          `${sunday.getFullYear()}-${me.toString().padStart(2, "0")}-${sunday
            .getDate()
            .toString()
            .padStart(2, "0")}`
        );
      }
    }
  }, [payCycleSettings, carriedPeriod?.periodStart, carriedPeriod?.periodEnd]);

  const handleCreateRun = async () => {
    if (isMockDataEnabled) {
      showError("Disable mock data to create live payroll runs.");
      return;
    }
    if (!periodStart || !periodEnd) {
      showError("Please select a period start and end date.");
      return;
    }
    const toastId = showLoading("Creating payroll run...") as string;
    try {
      const run = await createPayrollRun({
        periodStart,
        periodEnd,
        payCycleType: payCycleSettings?.payCycleType ?? "Weekly",
        notes: null,
      });
      if (run) {
        setRuns((prev) => [run, ...prev]);
        showSuccess("Payroll run created!");
        navigate(`/payroll/runs/${run.id}`);
      }
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl -tracking-tight">Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-background p-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label className="text-xs">Period start</Label>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Period end</Label>
              <div className="mt-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button onClick={handleCreateRun} className="w-full">
                <Plus className="h-4 w-4" />
                Create run
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.periodStart} → {r.periodEnd}</TableCell>
                    <TableCell>{r.payCycleType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(runStatusBadgeClass(r.status))}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => navigate(`/payroll/runs/${r.id}`)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No runs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollRunsPage;