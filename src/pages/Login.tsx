"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import CloudHorizonBackground from "@/components/CloudHorizonBackground";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function Login() {
  const navigate = useNavigate();

  // Render with a safe default; branding is loaded post-auth elsewhere if needed
  const [companyName] = React.useState<string>("Your Company");
  const [logoUrl] = React.useState<string>("");
  const [logoWidth] = React.useState<number | undefined>(undefined);
  const [logoHeight] = React.useState<number | undefined>(undefined);
  const [logoFit] = React.useState<"contain" | "cover" | "fill" | "none" | "scale-down">("contain");

  // Lightweight session status banner to confirm sign-in state
  const [status, setStatus] = React.useState<{ loading: boolean; email: string | null }>({
    loading: true,
    email: null,
  });

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;
      if (!mounted) return;
      setStatus({ loading: false, email });

      // If already signed in, send to dashboard/home
      if (email) {
        navigate("/", { replace: true });
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setStatus({ loading: false, email });
      if (email) {
        navigate("/", { replace: true });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen w-full relative">
      <CloudHorizonBackground />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md rounded-xl bg-white/85 backdrop-blur-md shadow-lg p-6">
          <div className="mb-6 text-center">
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
            <h1 className="mt-4 text-xl font-semibold text-gray-900">
              Welcome to {companyName}, Payroll System
            </h1>
          </div>

          {/* Session status banner */}
          <div className="mb-4">
            {status.loading ? (
              <div className="text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 inline-flex items-center">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Checking session…
              </div>
            ) : status.email ? (
              <div className="text-xs rounded-md bg-green-50 text-green-700 border border-green-200 px-3 py-2">
                Signed in as {status.email}. Redirecting…
              </div>
            ) : (
              <div className="text-xs rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2">
                Not signed in. Please enter your credentials below.
              </div>
            )}
          </div>

          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              className: {
                input: "bg-white/80",
                button: "bg-primary hover:bg-primary/90",
              },
            }}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;