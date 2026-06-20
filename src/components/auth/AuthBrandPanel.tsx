"use client";

import React from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import { KAN_BRAND, resolveAppBranding } from "@/config/branding";

export type AuthFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type AuthBrandPanelProps = {
  subtitle: string;
  features: AuthFeature[];
};

const AuthBrandPanel: React.FC<AuthBrandPanelProps> = ({ subtitle, features }) => {
  const { name, tagline } = resolveAppBranding();

  return (
    <div className="kan-auth-panel relative hidden flex-col justify-between p-10 text-white lg:flex lg:min-h-screen lg:p-14">
      <div className="kan-auth-panel-glow pointer-events-none absolute inset-0" />
      <div className="kan-cmyk-bar pointer-events-none absolute left-14 top-0 z-20 h-1 w-32" />

      <div className="relative z-10">
        <BrandLogo variant="auth" className="drop-shadow-sm" />

        <p className="mt-8 max-w-md text-lg leading-relaxed text-white/80">{subtitle}</p>

        {tagline && (
          <p className="mt-4 text-sm font-medium italic">
            <span className="text-[#E62229]">&ldquo;KAN DO IT</span>
            <span className="text-white/60"> — since 2000&rdquo;</span>
          </p>
        )}

        <div className="mt-10 space-y-5">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Icon className="h-4 w-4 text-[#EC008C]" />
              </div>
              <div>
                <div className="font-medium">{title}</div>
                <div className="text-sm leading-relaxed text-white/70">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-12 flex items-center gap-3 text-sm text-white/70">
        <span className="kan-cmyk-bar inline-block h-1 w-16 shrink-0" />
        <span>{name}</span>
        <span className="text-white/40">·</span>
        <span>{KAN_BRAND.tagline}</span>
        <ArrowRight className="ml-auto h-4 w-4 opacity-60" />
      </div>
    </div>
  );
};

export default AuthBrandPanel;
