"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BrandLogo from "@/components/brand/BrandLogo";
import { useStaffPwaInstall } from "@/hooks/use-staff-pwa-install";
import { staffApkDownloadPath } from "@/lib/staff-mobile";
import { staffPortalPath, STAFF_LOGIN_PATH } from "@/lib/staff-portal";
import { getBranding } from "@/config/branding";

const StaffInstallPage: React.FC = () => {
  const { canInstall, isInstalled, install, isNativeApp } = useStaffPwaInstall();
  const [apkExists, setApkExists] = useState<boolean | null>(null);
  const brand = getBranding();
  const apkUrl = staffApkDownloadPath();

  React.useEffect(() => {
    fetch(apkUrl, { method: "HEAD" })
      .then((res) => setApkExists(res.ok))
      .catch(() => setApkExists(false));
  }, [apkUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-fuchsia-50/30 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <BrandLogo variant="sidebar" alt={brand.name} className="h-10" />
          <div>
            <Badge className="bg-cyan-600 hover:bg-cyan-600">Employee app</Badge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Install Kan Printers Staff
            </h1>
            <p className="text-sm text-muted-foreground">
              Access payslips, leave, loans, and savings from your phone — no Google Play required.
            </p>
          </div>
        </div>

        {(isInstalled || isNativeApp) && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-900">You&apos;re using the installed staff app.</p>
                <p className="mt-1 text-sm text-emerald-800/80">
                  <Link to={staffPortalPath()} className="underline underline-offset-2">
                    Open your staff portal
                  </Link>{" "}
                  or{" "}
                  <Link to={STAFF_LOGIN_PATH} className="underline underline-offset-2">
                    sign in
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-cyan-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-cyan-600" />
              Option 1 — Install from browser (PWA)
            </CardTitle>
            <CardDescription>
              Recommended on Android Chrome. Adds a home-screen icon that opens the staff portal full screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Open this page in Chrome on your Android phone.</li>
              <li>Tap Install app below, or use the browser menu → Add to Home screen.</li>
              <li>Sign in with the email linked to your employee record.</li>
            </ol>
            {canInstall ? (
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={() => void install()}>
                <Download className="mr-2 h-4 w-4" />
                Install app
              </Button>
            ) : (
              <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
                If no install button appears, open{" "}
                <strong>{typeof window !== "undefined" ? window.location.origin : ""}{staffPortalPath("install")}</strong>{" "}
                in Chrome and choose <strong>Add to Home screen</strong> from the menu.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-fuchsia-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-fuchsia-600" />
              Option 2 — Android app file (APK)
            </CardTitle>
            <CardDescription>
              Download the company APK from Kan Printers. Not published on Google Play — install directly from
              our website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Download the APK using the button below (when available).</li>
              <li>Allow installs from your browser when Android prompts you.</li>
              <li>Open Kan Printers Staff and sign in with your work email.</li>
            </ol>
            {apkExists ? (
              <Button asChild className="w-full bg-fuchsia-600 hover:bg-fuchsia-700">
                <a href={apkUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Android app (APK)
                </a>
              </Button>
            ) : (
              <p className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
                The APK is not uploaded yet. Your payroll administrator can build it using{" "}
                <code className="text-xs">pnpm run cap:build:android</code> and publish the file to{" "}
                <code className="text-xs">{apkUrl}</code>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
            <p>
              Portal access must be enabled on your employee profile. Contact payroll at{" "}
              <a href="mailto:info@kanprinters.co.za" className="text-cyan-700 underline underline-offset-2">
                info@kanprinters.co.za
              </a>{" "}
              if you cannot sign in.
            </p>
          </CardContent>
        </Card>

        <Button asChild variant="ghost" className="text-cyan-800">
          <Link to={STAFF_LOGIN_PATH}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to staff login
          </Link>
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Web portal:{" "}
          <a
            href={typeof window !== "undefined" ? `${window.location.origin}${staffPortalPath()}` : staffPortalPath()}
            className="inline-flex items-center gap-1 underline underline-offset-2"
          >
            {typeof window !== "undefined" ? window.location.origin : ""}
            {staffPortalPath()}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  );
};

export default StaffInstallPage;
