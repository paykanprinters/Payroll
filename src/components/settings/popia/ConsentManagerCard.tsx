"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileCheck2 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/hooks/use-auth";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { CONSENT_TYPE_META, CONSENT_TYPES, type ConsentType } from "@/lib/popia/consent";
import {
  fetchConsentForEmployee,
  setConsent,
  type ConsentRecord,
} from "@/integrations/supabase/popia-queries";

const ConsentManagerCard: React.FC = () => {
  const { user } = useAuth();
  const { employees } = usePayrollProcessor();
  const [selectedId, setSelectedId] = useState<string>("");
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [saving, setSaving] = useState<ConsentType | null>(null);

  const sorted = useMemo(
    () => [...employees].sort((a, b) => (a.firstName || "").localeCompare(b.firstName || "")),
    [employees]
  );

  const load = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      setRecords([]);
      return;
    }
    setRecords(await fetchConsentForEmployee(employeeId));
  }, []);

  useEffect(() => {
    load(selectedId);
  }, [selectedId, load]);

  const grantedMap = useMemo(() => {
    const m = new Map<string, ConsentRecord>();
    records.forEach((r) => m.set(r.consentType, r));
    return m;
  }, [records]);

  const handleToggle = async (consentType: ConsentType, granted: boolean) => {
    if (!selectedId) return;
    setSaving(consentType);
    try {
      const result = await setConsent({
        employeeId: selectedId,
        consentType,
        granted,
        source: "admin",
        method: "Recorded by admin",
        recordedBy: user?.id,
      });
      if (result.ok) {
        showSuccess(`${CONSENT_TYPE_META[consentType].label}: ${granted ? "granted" : "revoked"}.`);
        await load(selectedId);
      } else {
        showError(result.error ?? "Failed to update consent.");
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5" /> Consent register
        </CardTitle>
        <CardDescription>
          Record and track each employee&apos;s consent. Biometric attendance is special personal information under
          POPIA and requires explicit consent.
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
        </div>

        {selectedId && (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
            {CONSENT_TYPES.map((type) => {
              const meta = CONSENT_TYPE_META[type];
              const rec = grantedMap.get(type);
              return (
                <div key={type} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {meta.label}
                      {meta.specialPi && (
                        <Badge variant="destructive" className="text-[10px]">
                          Special PI
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{meta.description}</p>
                    {rec?.updatedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rec.granted ? "Granted" : "Revoked"} · {new Date(rec.updatedAt).toLocaleDateString()}
                        {rec.source === "self" ? " · by employee" : ""}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={!!rec?.granted}
                    disabled={saving === type}
                    onCheckedChange={(v) => handleToggle(type, v)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsentManagerCard;
