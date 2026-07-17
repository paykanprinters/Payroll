"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, UserX, FileSearch } from "lucide-react";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/hooks/use-auth";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import {
  anonymizeEmployee,
  compilePersonalDataForEmployee,
} from "@/integrations/supabase/popia-queries";
import { countExportRecords } from "@/lib/popia/compile-personal-data";
import { downloadBlob, downloadSuccessMessage } from "@/lib/native-blob-download";

const DataSubjectRequestsCard: React.FC = () => {
  const { user } = useAuth();
  const { employees, refetchEmployees } = usePayrollProcessor();
  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  const sorted = useMemo(
    () => [...employees].sort((a, b) => (a.firstName || "").localeCompare(b.firstName || "")),
    [employees]
  );
  const selected = useMemo(() => employees.find((e) => e.id === selectedId), [employees, selectedId]);

  const handleExport = async () => {
    if (!selected) {
      showError("Select an employee first.");
      return;
    }
    const toastId = showLoading("Compiling personal data…") as string;
    setBusy(true);
    try {
      const exportData = await compilePersonalDataForEmployee(selected);
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const name = `personal-data-${selected.customEmployeeId || selected.id}.json`;
      const method = await downloadBlob(blob, name, "application/json");
      dismissToast(toastId);
      showSuccess(
        `${downloadSuccessMessage(name, method)} (${countExportRecords(exportData)} related records)`
      );
    } catch (e) {
      dismissToast(toastId);
      if ((e as Error)?.name === "AbortError") return;
      showError(e instanceof Error ? e.message : "Failed to export personal data.");
    } finally {
      setBusy(false);
    }
  };

  const handleErase = async () => {
    if (!selected) return;
    setConfirmErase(false);
    const toastId = showLoading("Anonymising employee…") as string;
    setBusy(true);
    try {
      const result = await anonymizeEmployee(selected.id, user?.id);
      dismissToast(toastId);
      if (result.ok) {
        showSuccess("Employee personal information anonymised. Statutory records were retained.");
        setSelectedId("");
        await refetchEmployees?.();
      } else {
        showError(result.error ?? "Failed to anonymise employee.");
      }
    } catch (e) {
      dismissToast(toastId);
      showError(e instanceof Error ? e.message : "Failed to anonymise employee.");
    } finally {
      setBusy(false);
    }
  };

  const alreadyAnonymized = Boolean((selected as { anonymizedAt?: string | null })?.anonymizedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" /> Data subject requests
        </CardTitle>
        <CardDescription>
          Fulfil POPIA access requests (right of access) by exporting an employee&apos;s full personal-data footprint,
          or honour an erasure request by anonymising their record while keeping statutory payroll history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Employee</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="sm:max-w-md">
              <SelectValue placeholder="Select an employee…" />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} {e.customEmployeeId ? `(${e.customEmployeeId})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {alreadyAnonymized && (
            <Badge variant="secondary" className="mt-1">
              Already anonymised
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport} disabled={!selected || busy}>
            <Download className="mr-2 h-4 w-4" /> Export personal data (JSON)
          </Button>
          <Button
            variant="destructive"
            onClick={() => setConfirmErase(true)}
            disabled={!selected || busy || alreadyAnonymized}
          >
            <UserX className="mr-2 h-4 w-4" /> Anonymise (erasure)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Anonymisation redacts identifying details (name, contact, ID, banking, biometric, health) and revokes portal
          access. Payslips and tax records are preserved for the statutory retention period and cannot be reversed.
        </p>
      </CardContent>

      <AlertDialog open={confirmErase} onOpenChange={setConfirmErase}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anonymise this employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently redacts the personal information of{" "}
              <strong>
                {selected?.firstName} {selected?.lastName}
              </strong>
              . Statutory payroll records are kept. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleErase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Anonymise
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default DataSubjectRequestsCard;
