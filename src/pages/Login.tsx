"use client";

import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import CloudHorizonBackground from "@/components/CloudHorizonBackground";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Users, CreditCard } from "lucide-react";

function Login() {
  const [companyName, setCompanyName] = React.useState<string>("Your Company");
  const [logoUrl, setLogoUrl] = React.useState<string>("");
  const [logoWidth, setLogoWidth] = React.useState<number | undefined>(undefined);
  const [logoHeight, setLogoHeight] = React.useState<number | undefined>(undefined);
  const [logoFit, setLogoFit] = React.useState<"contain" | "cover" | "fill" | "none" | "scale-down">("contain");

  React.useEffect(() => {
    const loadBranding = async () => {
      const { data, error } = await supabase.functions.invoke("get-branding");

      if (error) {
        console.warn("Login: Could not load branding:", error.message);
        return;
      }

      if (data) {
        const name: string = (data.companyName as string) ?? "Your Company";
        setCompanyName(name);

        const url = data.logoUrl as string | null;
        if (url) setLogoUrl(url);

        const w = data.logoWidth as number | null;
        const h = data.logoHeight as number | null;
        if (typeof w === "number") setLogoWidth(w);
        if (typeof h === "number") setLogoHeight(h);

        const fit = (data.logoFit as "contain" | "cover" | "fill" | "none" | "scale-down") ?? "contain";
        setLogoFit(fit);
      }
    };

    loadBranding();
  }, []);

  return (
    <div className="min-h-screen w-full relative">
      <CloudHorizonBackground />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-5xl rounded-2xl overflow-hidden bg-white/80 backdrop-blur-md shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left panel: branded info */}
            <div className="relative p-8 md:p-10 bg-gradient-to-br from-sky-400 to-blue-800 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/15 p-3">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Payroll Portal</h2>
                  <p className="text-white/90">Secure payroll and workforce management</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white/15 p-2">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Employee Management</p>
                    <p className="text-white/80 text-sm">Manage profiles, timesheets, and leave records</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white/15 p-2">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Payslip Generation</p>
                    <p className="text-white/80 text-sm">Create compliant payslips and payroll reports</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white/15 p-2">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Enterprise Security</p>
                    <p className="text-white/80 text-sm">Role-based access with secure Supabase auth</p>
                  </div>
                </div>
              </div>

              <p className="mt-10 text-xs text-white/75">
                © {new Date().getFullYear()} {companyName}. Secure payroll management.
              </p>
            </div>

            {/* Right panel: sign in */}
            <div className="p-8 md:p-10 bg-white/90">
              {/* Keep logo in place (above the form) */}
              <div className="text-center mb-6">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={`${companyName} Logo`}
                    className="mx-auto"
                    style={{
                      width: logoWidth ? `${logoWidth}px` : "auto",
                      height: logoHeight ? `${logoHeight}px` : "auto",
                      objectFit: logoFit,
                    }}
                  />
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome Back</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to access your dashboard
              </p>

              <div className="mt-6">
                <Auth
                  supabaseClient={supabase}
                  providers={[]}
                  appearance={{
                    theme: ThemeSupa,
                    className: {
                      input: "bg-white/80",
                      button: "bg-emerald-600 hover:bg-emerald-700 text-white",
                      label: "text-gray-700",
                    },
                  }}
                  theme="light"
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Need help signing in? Contact your administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;