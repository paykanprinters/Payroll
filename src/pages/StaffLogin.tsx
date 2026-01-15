"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { getBranding } from "@/config/branding";
import { ShieldCheck, Building2, KeySquare } from "lucide-react";

const StaffLogin: React.FC = () => {
  const b = getBranding();

  const lsName =
    (typeof window !== "undefined" &&
      (localStorage.getItem("companyTradingName") ||
        localStorage.getItem("companyLegalName"))) || null;
  const lsLogoUrl =
    (typeof window !== "undefined" && localStorage.getItem("companyLogoUrl")) || null;
  const lsLogoWidthRaw =
    (typeof window !== "undefined" && localStorage.getItem("companyLogoWidth")) || null;
  const lsLogoHeightRaw =
    (typeof window !== "undefined" && localStorage.getItem("companyLogoHeight")) || null;
  const lsLogoFitRaw =
    (typeof window !== "undefined" && localStorage.getItem("companyLogoFit")) || null;

  const name = lsName || b.name || "Your Company Name";
  const logoUrl = lsLogoUrl || b.logoUrl || "/logonscreen_for_workflow.png";
  const logoWidth = lsLogoWidthRaw ? Number(lsLogoWidthRaw) : (b.logoWidth ?? 140);
  const logoHeight = lsLogoHeightRaw ? Number(lsLogoHeightRaw) : (b.logoHeight ?? 56);
  const logoFit = (lsLogoFitRaw as React.CSSProperties["objectFit"]) || b.logoFit || "contain";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-lg border bg-white dark:bg-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Green brand panel */}
          <div className="relative flex flex-col justify-center p-8 bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white">
            <div className="mx-auto w-full max-w-sm">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={`${name} Logo`}
                  className="object-contain drop-shadow-md"
                  style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
                />
              )}
              <h1 className="mt-4 text-2xl font-bold">{name}</h1>
              <p className="mt-1 text-sm text-emerald-100">
                Staff access to your payroll portal.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-emerald-100" />
                  <div>
                    <div className="font-medium">Employee Self‑Service</div>
                    <div className="text-xs text-emerald-100">
                      View payslips and manage details.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <KeySquare className="h-5 w-5 text-emerald-100" />
                  <div>
                    <div className="font-medium">Secure Access</div>
                    <div className="text-xs text-emerald-100">
                      Protected login and data privacy.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-100" />
                  <div>
                    <div className="font-medium">Compliance</div>
                    <div className="text-xs text-emerald-100">
                      Consistent with company policy.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Auth form */}
          <div className="flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="w-full max-w-md p-8">
              <h2 className="text-xl font-semibold mb-2">Welcome Back</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to access the staff portal.
              </p>
              <div className="rounded-md border bg-white dark:bg-gray-900 p-4 shadow-sm">
                <Auth
                  supabaseClient={supabase}
                  providers={[]}
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