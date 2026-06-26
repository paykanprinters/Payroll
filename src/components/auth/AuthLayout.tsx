"use client";

import React from "react";
import AuthBrandPanel, { type AuthFeature } from "@/components/auth/AuthBrandPanel";
import BrandLogo from "@/components/brand/BrandLogo";
import { KAN_BRAND } from "@/config/branding";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  panelSubtitle: string;
  features: AuthFeature[];
  footerNote?: string;
  children: React.ReactNode;
};

const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  panelSubtitle,
  features,
  footerNote,
  children,
}) => {
  return (
    <div className="kan-auth-shell min-h-screen w-full bg-[#f4f4f5]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <AuthBrandPanel subtitle={panelSubtitle} features={features} />

        <div
          className="relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)",
          }}
        >
          <div className="kan-cmyk-bar pointer-events-none absolute left-0 right-0 top-0 h-1 lg:hidden" />

          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
              <BrandLogo variant="auth-mobile" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Payroll
              </span>
            </div>

            <div className="hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#EC008C]">
                {KAN_BRAND.shortName}
              </p>
            </div>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

            <div className="mt-8 rounded-2xl border border-border/80 bg-white p-6 shadow-sm">{children}</div>

            {footerNote && (
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{footerNote}</p>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
              Need help?{" "}
              <a
                href="mailto:info@kanprinters.co.za"
                className="font-medium text-[#EC008C] underline-offset-2 hover:underline"
              >
                info@kanprinters.co.za
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
