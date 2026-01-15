"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranding } from "@/config/branding";

type AuthLayoutProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ title = "Sign in", subtitle, children }) => {
  const b = getBranding();
  const name = b.name || "Your Company Name";
  const logoUrl = b.logoUrl || "/logonscreen_for_workflow.png";

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 text-white">
        <div className="absolute inset-0 opacity-20 pointer-events-none" />
        <div className="z-10 px-10 text-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${name} Logo`}
              className="mx-auto object-contain drop-shadow-lg"
              style={{ width: 200, height: 80 }}
            />
          )}
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-2 text-sm text-slate-200">
            Secure access to your payroll workspace.
          </p>
          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-sm leading-relaxed">
              Streamline payroll operations, manage employees, and keep compliance in check — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-6 lg:p-10 bg-slate-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <Card className="border bg-white/80 dark:bg-gray-900/80 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-semibold">{title}</CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
          {/* Mobile brand header */}
          <div className="mt-8 text-center lg:hidden">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={`${name} Logo`}
                className="mx-auto object-contain"
                style={{ width: 160, height: 64 }}
              />
            )}
            <div className="mt-2 text-sm font-medium">{name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;