"use client";

import React from "react";
import { Link, Navigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { authUiVariables } from "@/config/branding";
import AuthLayout from "@/components/auth/AuthLayout";
import { ShieldCheck, Building2, KeySquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { staffPortalPath } from "@/lib/staff-portal";
import StaffPwaInstallPrompt from "@/components/staff/StaffPwaInstallPrompt";

const StaffLogin: React.FC = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to={staffPortalPath()} replace />;
  }

  return (
    <AuthLayout
      title="Staff portal"
      subtitle="Sign in with the email linked to your employee record. Portal access must be active on your profile."
      panelSubtitle="Employee self-service — portal access must be enabled on your profile."
      features={[
        {
          icon: Building2,
          title: "Employee self‑service",
          description: "View payslips, check leave balances, and track loans & savings.",
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
      <StaffPwaInstallPrompt variant="banner" />

      <Auth
        supabaseClient={supabase}
        providers={[]}
        view="sign_in"
        showLinks={false}
        appearance={{ theme: ThemeSupa, variables: authUiVariables }}
        theme="light"
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          to={staffPortalPath("install")}
          className="font-semibold text-[#00AEEF] underline-offset-2 hover:underline"
        >
          Install the staff app on your phone
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Payroll administrator?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#00AEEF] underline-offset-2 hover:underline"
        >
          Sign in to the admin console
        </Link>
      </p>
    </AuthLayout>
  );
};

export default StaffLogin;
