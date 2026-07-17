"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, ShieldCheck } from "lucide-react";
import { showError } from "@/utils/toast";
import { useAuth } from "@/hooks/use-auth";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { usePopiaSettings } from "@/hooks/use-popia-settings";

const InformationOfficerCard: React.FC = () => {
  const { user } = useAuth();
  const { isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { settings, setSettings, isLoading, isSaving, save } = usePopiaSettings({
    isAuthenticated,
    isLoadingAuth,
    userId: user?.id,
  });

  const handleSave = async () => {
    if (settings.informationOfficerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.informationOfficerEmail)) {
      showError("Enter a valid Information Officer email address.");
      return;
    }
    if (settings.retentionYears < 1 || settings.retentionYears > 30) {
      showError("Retention must be between 1 and 30 years.");
      return;
    }
    await save(settings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Information Officer &amp; retention
        </CardTitle>
        <CardDescription>
          POPIA requires a registered Information Officer. These details are shown to staff in the privacy notice and
          drive how long personal information is kept before erasure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="io-name">Information Officer name</Label>
            <Input
              id="io-name"
              placeholder="e.g. Jane Doe (Owner)"
              value={settings.informationOfficerName}
              onChange={(e) => setSettings({ ...settings, informationOfficerName: e.target.value })}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="io-email">Information Officer email</Label>
            <Input
              id="io-email"
              placeholder="privacy@kanprinters.co.za"
              value={settings.informationOfficerEmail}
              onChange={(e) => setSettings({ ...settings, informationOfficerEmail: e.target.value })}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="io-phone">Information Officer phone</Label>
            <Input
              id="io-phone"
              placeholder="+27 ..."
              value={settings.informationOfficerPhone}
              onChange={(e) => setSettings({ ...settings, informationOfficerPhone: e.target.value })}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deputy-name">Deputy Information Officer (optional)</Label>
            <Input
              id="deputy-name"
              placeholder="Deputy name"
              value={settings.deputyOfficerName}
              onChange={(e) => setSettings({ ...settings, deputyOfficerName: e.target.value })}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retention">Retention period (years)</Label>
            <Input
              id="retention"
              type="number"
              min={1}
              max={30}
              value={settings.retentionYears}
              onChange={(e) => setSettings({ ...settings, retentionYears: Number(e.target.value) || 0 })}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              SARS requires payroll records to be kept for at least 5 years.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="regulator-url">Regulator complaint URL</Label>
            <Input
              id="regulator-url"
              placeholder="https://inforegulator.org.za/"
              value={settings.regulatorComplaintUrl}
              onChange={(e) => setSettings({ ...settings, regulatorComplaintUrl: e.target.value })}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="residency">Data residency / cross-border note</Label>
          <Textarea
            id="residency"
            rows={3}
            placeholder="Where personal information is hosted and why the transfer is lawful (POPIA s72)."
            value={settings.dataResidencyNote}
            onChange={(e) => setSettings({ ...settings, dataResidencyNote: e.target.value })}
            disabled={isLoading}
          />
        </div>

        <Button onClick={handleSave} disabled={isLoading || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving…" : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default InformationOfficerCard;
