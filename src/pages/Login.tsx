"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { authUiVariables } from "@/config/branding";
import AuthLayout from "@/components/auth/AuthLayout";
import { ShieldCheck, Building2, KeySquare } from "lucide-react";

const Login: React.FC = () => {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your payroll workspace."
      panelSubtitle="Secure payroll access for admins, managers, and staff."
      footerNote="By signing in you agree to your organization's policies and acceptable use."
      features={[
        {
          icon: Building2,
          title: "Multi‑tenant ready",
          description: "Manage multiple organizations with clean separation.",
        },
        {
          icon: KeySquare,
          title: "Role-based controls",
          description: "Admin, Manager, and Staff experiences built in.",
        },
        {
          icon: ShieldCheck,
          title: "Governance-first",
          description: "Auditable actions and maker-checker workflow.",
        },
      ]}
    >
      <Auth
        supabaseClient={supabase}
        providers={[]}
        view="sign_in"
        showLinks={false}
        appearance={{ theme: ThemeSupa, variables: authUiVariables }}
        theme="light"
      />
    </AuthLayout>
  );
};

export default Login;
