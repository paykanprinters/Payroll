"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { ShieldCheck, FileSpreadsheet, ScrollText, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authUiVariables } from "@/config/branding";
import AuthLayout from "@/components/auth/AuthLayout";

const AccountantLogin: React.FC = () => {
  return (
    <AuthLayout
      title="Accountant & auditor sign-in"
      subtitle="Sign in with the email and password your payroll administrator sent you."
      panelSubtitle="Read-only payroll access for the company's accountant and auditors."
      footerNote="Access is read-only and every report you open or download is recorded in the audit log."
      features={[
        {
          icon: FileSpreadsheet,
          title: "Ledgers and statutory returns",
          description: "Payroll journal, EMP201, EMP501, IRP5 and per-employee deductions, ready to download.",
        },
        {
          icon: ShieldCheck,
          title: "Read-only by design",
          description: "Nothing can be changed from an accountant login.",
        },
        {
          icon: ScrollText,
          title: "Audit evidence",
          description: "Run approvals, master data changes and the user access list in one place.",
        },
      ]}
    >
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
        <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          After your password you'll be asked for a 6-digit code from an authenticator app (such as
          Google or Microsoft Authenticator). The first time, you'll scan a QR code to set it up.
        </p>
      </div>

      <Auth
        supabaseClient={supabase}
        providers={[]}
        view="sign_in"
        showLinks={false}
        appearance={{ theme: ThemeSupa, variables: authUiVariables }}
        theme="light"
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Not an accountant?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#00AEEF] underline-offset-2 hover:underline"
        >
          Go to the main sign-in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default AccountantLogin;
