"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { useCompanyBannerName } from "@/hooks/use-company-banner-name";

export interface KanPageBannerProps {
  icon: LucideIcon;
  title: string;
  description: string;
  companyName?: string;
  showCompanyName?: boolean;
  actions?: React.ReactNode;
}

const KanPageBanner: React.FC<KanPageBannerProps> = ({
  icon: Icon,
  title,
  description,
  companyName: companyNameProp,
  showCompanyName = true,
  actions,
}) => {
  const defaultCompanyName = useCompanyBannerName();
  const companyName = companyNameProp ?? defaultCompanyName;

  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            {showCompanyName && <p className="text-sm text-white/70">{companyName}</p>}
            <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">{description}</p>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};

export default KanPageBanner;
