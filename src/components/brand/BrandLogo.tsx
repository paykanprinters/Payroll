"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  KAN_BRAND,
  SIDEBAR_LOGO_FALLBACK,
  SIDEBAR_LOGO_HEIGHT,
  type BrandingConfig,
} from "@/config/branding";

export type BrandLogoVariant = "sidebar" | "sidebar-collapsed" | "auth" | "auth-mobile" | "inline";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  alt?: string;
  className?: string;
  onError?: () => void;
  /** Override src (e.g. company payslip logo — not for sidebar/auth). */
  src?: string;
};

const VARIANTS: Record<
  BrandLogoVariant,
  { src: string; width?: number; height: number; maxWidth?: string; fit: NonNullable<BrandingConfig["logoFit"]> }
> = {
  sidebar: {
    src: KAN_BRAND.sidebarLogoUrl,
    height: KAN_BRAND.sidebarLogoHeight,
    maxWidth: "14rem",
    fit: "contain",
  },
  "sidebar-collapsed": {
    src: KAN_BRAND.iconUrl,
    height: 32,
    width: 32,
    fit: "contain",
  },
  auth: {
    src: KAN_BRAND.authLogoUrl,
    height: KAN_BRAND.authLogoHeight,
    maxWidth: "20rem",
    fit: "contain",
  },
  "auth-mobile": {
    src: KAN_BRAND.logoUrlLight,
    height: 48,
    maxWidth: "12rem",
    fit: "contain",
  },
  inline: {
    src: KAN_BRAND.logoUrlLight,
    height: KAN_BRAND.logoHeight,
    width: KAN_BRAND.logoWidth,
    fit: KAN_BRAND.logoFit,
  },
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "inline",
  alt,
  className,
  onError,
  src,
}) => {
  const cfg = VARIANTS[variant];
  const resolvedSrc = src ?? cfg.src;
  const label = alt ?? `${KAN_BRAND.name} logo`;

  return (
    <img
      src={resolvedSrc}
      alt={label}
      onError={onError}
      className={cn("object-left object-contain", className)}
      style={{
        width: cfg.width,
        height: cfg.height,
        maxWidth: cfg.maxWidth,
        objectFit: cfg.fit,
      }}
    />
  );
};

export { SIDEBAR_LOGO_FALLBACK, SIDEBAR_LOGO_HEIGHT };
export default BrandLogo;
