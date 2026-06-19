"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { Link2, RefreshCcw } from "lucide-react";
import { useBiometricApiSettings } from "@/hooks/use-biometric-api-settings";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_BIOMETRIC_API_URL } from "@/lib/biometric-attendance-parser";

const schema = z.object({
  apiUrl: z
    .string()
    .min(1, "Biometric API URL is required")
    .url("Enter a valid URL (including http:// or https://)"),
});

type FormValues = z.infer<typeof schema>;

const BiometricApiSettings: React.FC = () => {
  const { user } = useAuth();
  const { isMockDataEnabled, isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { settings, isLoading, saveSettings, testConnection } = useBiometricApiSettings({
    isMockDataEnabled,
    isAuthenticated,
    isLoadingAuth,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      apiUrl: DEFAULT_BIOMETRIC_API_URL,
    },
  });

  useEffect(() => {
    if (settings?.apiUrl) {
      form.reset({ apiUrl: settings.apiUrl });
    }
  }, [settings?.apiUrl, form]);

  const handleTest = async () => {
    const apiUrl = form.getValues("apiUrl").trim();
    if (!apiUrl) {
      showError("Enter the Biometric API URL first.");
      return;
    }

    const toastId = showLoading("Testing biometric API connection…") as string;
    try {
      const result = await testConnection(apiUrl);
      dismissToast(toastId);
      showSuccess(
        `Connected. Received ${result.lineCount ?? 0} log line(s)${
          result.sample ? `: ${result.sample.split("\n")[0]}` : "."
        }`
      );
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Connection test failed.");
    }
  };

  const onSubmit = async (values: FormValues) => {
    const ok = await saveSettings({ apiUrl: values.apiUrl.trim() });
    if (ok) form.reset({ apiUrl: values.apiUrl.trim() });
  };

  if (user?.role !== "Admin" && user?.role !== "Manager") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biometric API</CardTitle>
          <CardDescription>Only admins and managers can configure the biometric attendance API.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biometric API</CardTitle>
        <CardDescription>
          Point payroll at your attendance log server. Timesheet import will fetch punches from this URL and match
          employees by their <strong>Personal ID</strong> (clock ID).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="biometric-api-url">Biometric API URL</Label>
            <Input
              id="biometric-api-url"
              placeholder={DEFAULT_BIOMETRIC_API_URL}
              {...form.register("apiUrl")}
              disabled={isLoading}
            />
            {form.formState.errors.apiUrl && (
              <p className="text-sm text-destructive">{form.formState.errors.apiUrl.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Example log line:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                &lt;Attendance&gt;: 3 : 2022-08-16 07:52:47 (1, 0)
              </code>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={handleTest} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
              Test connection
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Link2 className="h-4 w-4" />
              Save API URL
            </Button>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How import works</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>On Timesheet → Import clock times, choose a date range and fetch from this API.</li>
              <li>Each employee&apos;s <strong>Personal ID</strong> must match the clock ID in the logs.</li>
              <li>Earliest punch of the day becomes Time In; latest becomes Time Out.</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BiometricApiSettings;
