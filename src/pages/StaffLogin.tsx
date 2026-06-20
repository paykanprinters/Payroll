"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { authUiVariables } from "@/config/branding";
import AuthLayout from "@/components/auth/AuthLayout";
import { ShieldCheck, Building2, KeySquare } from "lucide-react";

const StaffLogin: React.FC = () => {
  return (
    <AuthLayout
      title="Staff portal"
      subtitle="Sign in to view payslips, timesheets, and leave."
      panelSubtitle="Staff access to your payroll portal."
      features={[
        {
          icon: Building2,
          title: "Employee self‑service",
          description: "View payslips, submit timesheets, manage leave.",
        },
        {
          icon: KeySquare,
          title: "Secure access",
          description: "Protected login with privacy controls.",
        },
        {
          icon: ShieldCheck,
          title: "Compliance-ready",
          description: "Consistent processes and audit trail coverage.",
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

export default StaffLogin;
