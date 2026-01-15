"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { fetchPayrollRuns, createPayrollRun, PayrollRun } from "@/integrations/supabase/payroll-run-queries";

const PayrollRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isMockDataEnabled, payCycleSettings } = usePayrollProcessor({ silent: true });
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const list = await fetchPayrollRuns();
      setRuns(list);
    };
    load();
  }, []);

  useEffect(() => {
    if (payCycleSettings) {
      // Default to current week/month window if available
      const today = new Date();
      const y = today.getFullYear();
      const m = (today.getMonth() + 1).toString().padStart(2, "0");
      const d = today.getDate().toString().padStart(2, "0");
      if (payCycleSettings.payCycleType === "Monthly") {
        const start = `${y}-${m}-01`;
        const end = `${y}-${m}-${new Date(y, today.getMonth() + 1, 0).getDate().toString().padStart(2, "0")}`;
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
        setPeriodStart(`${monday.getFullYear()}-${ms.toString().padStart(2, "0")}-${monday.getDate().toString().padStart(2, "0")}`);
        setPeriodEnd(`${sunday.getFullYear()}-${me.toString().padStart(2, "0")}-${sunday.getDate().toString().padStart(2, "0")}`);
      }
    }
  }, [payCycleSettings]);

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
        setRuns(prev => [run, ...prev]);
        showSuccess("Payroll run created!");
        navigate(`/payroll/runs/${run.id}`);
      }
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground">Period start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground">Period end</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              <Button onClick={handleCreateRun} className="w-full md:w-auto">Create run</Button>
            </div>
          </div>

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
                  <TableCell>{r.periodStart} → {r.periodEnd}</TableCell>
                  <TableCell>{r.payCycleType}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(r.createdAt || "").toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" onClick={() => navigate(`/payroll/runs/${r.id}`)}>Open</Button>
                  </TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No runs yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollRunsPage;