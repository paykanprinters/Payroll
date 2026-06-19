"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { getBranding } from "@/config/branding";
import { ShieldCheck, Building2, KeySquare, ArrowRight } from "lucide-react";

const StaffLogin: React.FC = () => {
  const b = getBranding();

  const lsName =
    (typeof window !== "undefined" &&
      (localStorage.getItem("companyTradingName") || localStorage.getItem("companyLegalName"))) ||
    null;
  const lsLogoUrl = (typeof window !== "undefined" && localStorage.getItem("companyLogoUrl")) || null;
  const lsLogoWidthRaw = (typeof window !== "undefined" && localStorage.getItem("companyLogoWidth")) || null;
  const lsLogoHeightRaw = (typeof window !== "undefined" && localStorage.getItem("companyLogoHeight")) || null;
  const lsLogoFitRaw = (typeof window !== "undefined" && localStorage.getItem("companyLogoFit")) || null;

  const name = lsName || b.name || "Your Company";
  const logoUrl = lsLogoUrl || b.logoUrl || "/logonscreen_for_workflow.png";
  const logoWidth = lsLogoWidthRaw ? Number(lsLogoWidthRaw) : b.logoWidth ?? 140;
  const logoHeight = lsLogoHeightRaw ? Number(lsLogoHeightRaw) : b.logoHeight ?? 56;
  const logoFit = (lsLogoFitRaw as React.CSSProperties["objectFit"]) || b.logoFit || "contain";

  return (
    <div className="min-h-screen w-full bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Brand panel */}
          <div className="relative flex flex-col justify-between bg-[#0B253A] p-10 text-white">
            <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(122,186,72,0.20),transparent_55%)]" />

            <div className="relative z-10">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={`${name} Logo`}
                  className="object-contain"
                  style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
                />
              )}

              <h1 className="mt-6 text-3xl font-semibold -tracking-tight">{name}</h1>
              <p className="mt-2 text-base leading-relaxed text-white/75">Staff access to your payroll portal.</p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Employee self‑service</div>
                    <div className="text-sm text-white/70">View payslips, submit timesheets, manage leave.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <KeySquare className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Secure access</div>
                    <div className="text-sm text-white/70">Protected login with privacy controls.</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Compliance-ready</div>
                    <div className="text-sm text-white/70">Consistent processes and audit trail coverage.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 flex items-center gap-2 text-sm text-white/70">
              <span>Continue</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* Right: Auth form */}
          <div className="flex items-center justify-center p-10">
            <div className="w-full max-w-md">
              <h2 className="text-2xl font-semibold -tracking-tight">Welcome back</h2>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to access the staff portal.</p>

              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                <Auth
                  supabaseClient={supabase}
                  providers={[]}
                  view="sign_in"
                  showLinks={false}
                  appearance={{ theme: ThemeSupa }}
                  theme="light"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;