"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import {
  fetchActivePrivacyPolicy,
  fetchConsentForEmployee,
  fetchPopiaSettings,
  hasAcceptedPolicy,
  recordPolicyAcceptance,
  setConsent,
  type ConsentRecord,
  type PopiaSettings,
  type PrivacyPolicy,
} from "@/integrations/supabase/popia-queries";
import { CONSENT_TYPE_META, type ConsentType } from "@/lib/popia/consent";

const STAFF_MANAGEABLE: ConsentType[] = ["notifications_email", "notifications_sms", "biometric"];

const StaffPrivacyPage: React.FC = () => {
  const { user } = useAuth();
  const { employee } = useStaffPortalContext();

  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [popia, setPopia] = useState<PopiaSettings | null>(null);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [saving, setSaving] = useState<ConsentType | null>(null);
  const [accepting, setAccepting] = useState(false);

  const loadConsents = useCallback(async () => {
    setConsents(await fetchConsentForEmployee(employee.id));
  }, [employee.id]);

  useEffect(() => {
    (async () => {
      const [activePolicy, settings] = await Promise.all([fetchActivePrivacyPolicy(), fetchPopiaSettings()]);
      setPolicy(activePolicy);
      setPopia(settings);
      if (activePolicy && user?.id) {
        setAccepted(await hasAcceptedPolicy(activePolicy.id, user.id));
      }
    })();
    loadConsents();
  }, [user?.id, loadConsents]);

  const consentMap = useMemo(() => {
    const m = new Map<string, ConsentRecord>();
    consents.forEach((c) => m.set(c.consentType, c));
    return m;
  }, [consents]);

  const handleAccept = async () => {
    if (!policy || !user?.id) return;
    setAccepting(true);
    try {
      const result = await recordPolicyAcceptance(policy, user.id, employee.id);
      if (result.ok) {
        setAccepted(true);
        showSuccess("Thank you. Your acknowledgement has been recorded.");
      } else {
        showError(result.error ?? "Failed to record acknowledgement.");
      }
    } finally {
      setAccepting(false);
    }
  };

  const handleToggle = async (type: ConsentType, granted: boolean) => {
    setSaving(type);
    try {
      const result = await setConsent({
        employeeId: employee.id,
        consentType: type,
        granted,
        source: "self",
        method: "Self-service (staff portal)",
        recordedBy: user?.id,
      });
      if (result.ok) {
        showSuccess(`${CONSENT_TYPE_META[type].label}: ${granted ? "enabled" : "disabled"}.`);
        await loadConsents();
      } else {
        showError(result.error ?? "Failed to update your preference.");
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-cyan-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-700" />
            Privacy &amp; your data
          </CardTitle>
          <CardDescription>
            How your personal information is used, and the choices you can make about it.
          </CardDescription>
        </CardHeader>
      </Card>

      {policy ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {policy.title}
              <span className="text-sm font-normal text-muted-foreground">v{policy.version}</span>
              {accepted && (
                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Acknowledged
                </Badge>
              )}
            </CardTitle>
            {policy.summary && <CardDescription>{policy.summary}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm">
              {policy.body}
            </div>
            {!accepted && (
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting ? "Saving…" : "I have read and understood"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardDescription>No privacy notice has been published yet.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your communication &amp; data preferences</CardTitle>
          <CardDescription>Manage your consent for notifications and biometric attendance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {STAFF_MANAGEABLE.map((type) => {
            const meta = CONSENT_TYPE_META[type];
            const rec = consentMap.get(type);
            return (
              <div key={type} className="flex items-start justify-between gap-4 rounded-xl border p-3">
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
                </div>
                <Switch
                  checked={!!rec?.granted}
                  disabled={saving === type}
                  onCheckedChange={(v) => handleToggle(type, v)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {(popia?.informationOfficerName || popia?.informationOfficerEmail || popia?.dataResidencyNote) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who to contact</CardTitle>
            <CardDescription>
              For any privacy request (access, correction, objection), contact our Information Officer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {popia?.informationOfficerName && (
              <p>
                <span className="font-medium">Information Officer:</span> {popia.informationOfficerName}
              </p>
            )}
            {popia?.informationOfficerEmail && (
              <p>
                <span className="font-medium">Email:</span>{" "}
                <a className="text-cyan-700 underline" href={`mailto:${popia.informationOfficerEmail}`}>
                  {popia.informationOfficerEmail}
                </a>
              </p>
            )}
            {popia?.informationOfficerPhone && (
              <p>
                <span className="font-medium">Phone:</span> {popia.informationOfficerPhone}
              </p>
            )}
            {popia?.dataResidencyNote && (
              <p className="pt-2 text-muted-foreground">{popia.dataResidencyNote}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffPrivacyPage;
