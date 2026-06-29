"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Save } from "lucide-react";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import {
  fetchNotificationLog,
  sendTestEmail,
  type NotificationLogEntry,
} from "@/integrations/supabase/notification-queries";

// Sender must be on the Resend-verified domain (pay.kanprinters.co.za).
const DEFAULT_SENDER_EMAIL = "info@pay.kanprinters.co.za";

const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { settings, setSettings, isLoading, isSaving, save } = useNotificationSettings({
    isAuthenticated,
    isLoadingAuth,
    userId: user?.id,
  });

  const [testTo, setTestTo] = useState("");
  const [log, setLog] = useState<NotificationLogEntry[]>([]);

  const isAdmin = user?.role === "Admin";

  const loadLog = React.useCallback(async () => {
    const rows = await fetchNotificationLog(20);
    setLog(rows);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoadingAuth) loadLog();
  }, [isAuthenticated, isLoadingAuth, loadLog]);

  // Default to the Resend-verified sender when no address has been configured yet.
  useEffect(() => {
    if (isLoading || settings.fromEmail.trim()) return;
    setSettings((prev) => ({ ...prev, fromEmail: DEFAULT_SENDER_EMAIL }));
  }, [isLoading, settings.fromEmail, setSettings]);

  const handleSave = async () => {
    const fromEmail = settings.fromEmail.trim();
    if (!fromEmail) {
      showError("Sender email is required. Use an address on your verified Resend domain.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      showError("Enter a valid sender email address.");
      return;
    }
    await save(settings);
  };

  const handleTest = async () => {
    const fromEmail = settings.fromEmail.trim();
    if (!fromEmail) {
      showError("Set a sender email and click Save before sending a test.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      showError("Enter a valid sender email address, then save settings.");
      return;
    }
    const to = testTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      showError("Enter a valid email address to send the test to.");
      return;
    }
    const toastId = showLoading("Sending test email…") as string;
    try {
      const saved = await save(settings);
      if (!saved) {
        dismissToast(toastId);
        return;
      }
      const result = await sendTestEmail(to, settings.fromName || "Payroll");
      dismissToast(toastId);
      if (result.ok) {
        showSuccess(`Test email sent to ${to}.`);
        loadLog();
      } else {
        showError(result.error ?? "Failed to send test email.");
      }
    } catch (e) {
      dismissToast(toastId);
      showError(e instanceof Error ? e.message : "Failed to send test email.");
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Only admins can configure email notifications.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Email Notifications (Resend)
          </CardTitle>
          <CardDescription>
            Configure the sender identity and which emails the system sends. The Resend API key is stored
            securely on the server as a secret and is never exposed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from-name">Sender name</Label>
              <Input
                id="from-name"
                placeholder="Kan Printers Payroll"
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-email">Sender email (verified domain)</Label>
              <Input
                id="from-email"
                placeholder="info@pay.kanprinters.co.za"
                value={settings.fromEmail}
                onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Required. Must be on a domain verified in Resend. Save settings before sending a test.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-to">Reply-to (optional)</Label>
              <Input
                id="reply-to"
                placeholder="hr@kanprinters.co.za"
                value={settings.replyTo}
                onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin email (reminders / CC)</Label>
              <Input
                id="admin-email"
                placeholder="admin@kanprinters.co.za"
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="portal-url">Staff portal URL (link in emails)</Label>
              <Input
                id="portal-url"
                placeholder="https://payroll.kanprinters.co.za/staff/login"
                value={settings.portalUrl}
                onChange={(e) => setSettings({ ...settings, portalUrl: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email payslips to employees</p>
                <p className="text-sm text-muted-foreground">Allow sending payslip PDFs to employees by email.</p>
              </div>
              <Switch
                checked={settings.sendPayslipEmails}
                onCheckedChange={(v) => setSettings({ ...settings, sendPayslipEmails: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Send payroll reminders</p>
                <p className="text-sm text-muted-foreground">Email blockers/reminders before a payroll run is finalised.</p>
              </div>
              <Switch
                checked={settings.sendReminders}
                onCheckedChange={(v) => setSettings({ ...settings, sendReminders: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">CC admin on payslip emails</p>
                <p className="text-sm text-muted-foreground">Copy the admin email on every payslip sent.</p>
              </div>
              <Switch
                checked={settings.ccAdmins}
                onCheckedChange={(v) => setSettings({ ...settings, ccAdmins: v })}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Send a test email</CardTitle>
          <CardDescription>Verify your Resend configuration end to end.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-to">Recipient</Label>
              <Input
                id="test-to"
                placeholder="you@example.com"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleTest}>
              <Send className="mr-2 h-4 w-4" /> Send test
            </Button>
          </div>
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent deliveries</CardTitle>
            <CardDescription>Last {log.length} email events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Recipient</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-4 capitalize">{row.category}</td>
                      <td className="py-2 pr-4">{row.recipient}</td>
                      <td className="py-2 pr-4">
                        <span className={row.status === "sent" ? "text-emerald-600" : "text-destructive"}>
                          {row.status}
                        </span>
                        {row.error ? <span className="block text-xs text-muted-foreground">{row.error}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationSettings;
