"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { authUiVariables } from "@/config/branding";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import { ShieldCheck, Building2, KeySquare } from "lucide-react";

const Login: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <AuthBrandPanel
            subtitle="Secure payroll access for admins, managers, and staff."
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
          />

          <div className="flex items-center justify-center p-10">
            <div className="w-full max-w-md">
              <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to access your workspace.</p>

              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                <Auth
                  supabaseClient={supabase}
                  providers={[]}
                  view="sign_in"
                  showLinks={false}
                  appearance={{ theme: ThemeSupa, variables: authUiVariables }}
                  theme="light"
                />
              </div>

              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                By signing in you agree to your organization's policies and acceptable use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
