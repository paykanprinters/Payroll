"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { getBranding } from "@/config/branding";

const Login: React.FC = () => {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Gradient accent header (matches payroll theme) */}
        <div className="mb-6">
          <div className="h-20 rounded-2xl bg-gradient-to-r from-sky-300 via-indigo-400 to-fuchsia-500 shadow-sm" />
        </div>

        {/* Company branding */}
        <div className="flex flex-col items-center mb-6">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${name} Logo`}
              className="object-contain drop-shadow-sm"
              style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
            />
          )}
          <span className="mt-2 font-semibold">{name}</span>
        </div>

        {/* Auth card */}
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4 shadow-sm">
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{ theme: ThemeSupa }}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;