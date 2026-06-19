"use client";

import React from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import { resolveStoredBranding } from "@/config/branding";

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
  const { name, tagline, logoUrl, logoWidth, logoHeight, logoFit } = resolveStoredBranding();

  return (
    <div className="kan-auth-panel relative flex flex-col justify-between p-10 text-white">
      <div className="kan-auth-panel-glow pointer-events-none absolute inset-0" />
      <div className="kan-cmyk-bar pointer-events-none absolute left-10 top-0 z-20 hidden h-1 w-28 lg:block" />

      <div className="relative z-10">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="object-contain"
            style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
          />
        )}

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-base leading-relaxed text-white/75">{subtitle}</p>

        {tagline && (
          <p className="mt-3 text-sm font-medium italic">
            <span className="text-[#E62229]">&ldquo;KAN DO IT</span>
            <span className="text-white/60"> — since 2000&rdquo;</span>
          </p>
        )}

        <div className="mt-8 space-y-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#EC008C]" />
              <div>
                <div className="font-medium">{title}</div>
                <div className="text-sm text-white/70">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-10 flex items-center gap-3 text-sm text-white/70">
        <span className="kan-cmyk-bar inline-block h-1 w-16 shrink-0" />
        <span>Continue</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </div>
  );
};

export default AuthBrandPanel;
