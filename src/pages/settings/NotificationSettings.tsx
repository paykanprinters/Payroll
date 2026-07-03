"use client";

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Save, MessageSquare, RefreshCw } from "lucide-react";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import {
  fetchNotificationLog,
  sendTestEmail,
  sendTestSms,
  type NotificationLogEntry,
} from "@/integrations/supabase/notification-queries";
import { isValidSaMobile } from "@/lib/sms/normalize-sa-msisdn";
import { statusBadgeClass } from "@/lib/notification-delivery";

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
  const [testSmsTo, setTestSmsTo] = useState("");
  const [log, setLog] = useState<NotificationLogEntry[]>([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "email" | "sms">("all");

  const isAdmin = user?.role === "Admin";

  const loadLog = React.useCallback(async () => {
    setIsLogLoading(true);
    const rows = await fetchNotificationLog(50);
    setLog(rows);
    setIsLogLoading(false);
  }, []);

  const filteredLog = React.useMemo(() => {
    if (logFilter === "all") return log;
    return log.filter((row) => row.channel === logFilter);
  }, [log, logFilter]);

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

  const handleTestSms = async () => {
    if (!settings.smsSenderId.trim()) {
      showError("Set a Sender ID and click Save before sending a test SMS.");
      return;
    }
    const to = testSmsTo.trim();
    if (!isValidSaMobile(to)) {
      showError("Enter a valid South African mobile number (e.g. 0821234567).");
      return;
    }
    const toastId = showLoading("Sending test SMS…") as string;
    try {
      const saved = await save(settings);
      if (!saved) {
        dismissToast(toastId);
        return;
      }
      const result = await sendTestSms(to);
      dismissToast(toastId);
      if (result.ok) {
        showSuccess(`Test SMS sent to ${to}.`);
        loadLog();
      } else {
        showError(result.error ?? "Failed to send test SMS.");
      }
    } catch (e) {
      dismissToast(toastId);
      showError(e instanceof Error ? e.message : "Failed to send test SMS.");
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
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Delivery log</CardTitle>
            <CardDescription>
              Track every email and SMS the system attempted to send — including welcome messages,
              payslips, reminders, and tests. Failed and skipped rows show the reason in the Details
              column.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLog} disabled={isLogLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLogLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["all", "email", "sms"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={logFilter === value ? "default" : "outline"}
                onClick={() => setLogFilter(value)}
              >
                {value === "all" ? "All" : value.toUpperCase()}
              </Button>
            ))}
          </div>
          {filteredLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isLogLoading
                ? "Loading delivery history…"
                : "No deliveries recorded yet. After you add an employee or send a test message, results will appear here with sent, skipped, or failed status."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Channel</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Recipient</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.map((row) => (
                    <tr key={row.id} className="border-b align-top last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-4 uppercase">{row.channel}</td>
                      <td className="py-2 pr-4 capitalize">{row.category}</td>
                      <td className="py-2 pr-4 max-w-[10rem] break-all">{row.recipient}</td>
                      <td className="py-2 pr-4 max-w-[12rem] break-words">{row.subject ?? "—"}</td>
                      <td className={`py-2 pr-4 capitalize ${statusBadgeClass(row.status)}`}>{row.status}</td>
                      <td className="py-2 pr-4 max-w-[18rem] text-xs text-muted-foreground break-words">
                        {row.error ?? (row.status === "sent" ? "Delivered" : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Message wording & templates</CardTitle>
          <CardDescription>
            Customise welcome, payslip, and payroll message text — including on/off switches per
            template and optional company logo in emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/settings/message-templates">Open message templates</Link>
          </Button>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> SMS Notifications (SMS Portal)
          </CardTitle>
          <CardDescription>
            Send SMS via SMS Portal. Credentials (Client ID &amp; API Secret) are stored securely on the server as
            secrets and never exposed here. SMS is billed per message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-sender">Sender ID</Label>
              <Input
                id="sms-sender"
                placeholder="KanPrint"
                value={settings.smsSenderId}
                onChange={(e) => setSettings({ ...settings, smsSenderId: e.target.value })}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                The name/number messages are sent from. Must be registered on your SMS Portal account.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable SMS notifications</p>
                <p className="text-sm text-muted-foreground">Master switch for all outgoing SMS.</p>
              </div>
              <Switch
                checked={settings.smsEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, smsEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Payslip-ready SMS alerts</p>
                <p className="text-sm text-muted-foreground">Text employees when their payslip is available.</p>
              </div>
              <Switch
                checked={settings.sendPayslipSms}
                disabled={!settings.smsEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, sendPayslipSms: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SMS payroll reminders</p>
                <p className="text-sm text-muted-foreground">Text staff about blockers before a payroll run.</p>
              </div>
              <Switch
                checked={settings.sendSmsReminders}
                disabled={!settings.smsEnabled}
                onCheckedChange={(v) => setSettings({ ...settings, sendSmsReminders: v })}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving…" : "Save settings"}
          </Button>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-sms-to">Send a test SMS</Label>
              <Input
                id="test-sms-to"
                placeholder="0821234567"
                value={testSmsTo}
                onChange={(e) => setTestSmsTo(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleTestSms} disabled={!settings.smsEnabled}>
              <Send className="mr-2 h-4 w-4" /> Send test SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
