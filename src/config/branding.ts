"use client";

export type BrandingConfig = {
  name?: string;
  shortName?: string;
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
};

export function getBranding(): BrandingConfig {
  const env = import.meta.env as any;

  const name = env.VITE_COMPANY_NAME || undefined;
  const shortName = env.VITE_COMPANY_SHORT_NAME || undefined;
  const logoUrl = env.VITE_COMPANY_LOGO_URL || undefined;

  const logoWidthRaw = env.VITE_COMPANY_LOGO_WIDTH;
  const logoHeightRaw = env.VITE_COMPANY_LOGO_HEIGHT;
  const logoFitRaw = env.VITE_COMPANY_LOGO_FIT;

  const logoWidth = logoWidthRaw != null ? Number(logoWidthRaw) : undefined;
  const logoHeight = logoHeightRaw != null ? Number(logoHeightRaw) : undefined;
  const logoFit = (logoFitRaw as BrandingConfig["logoFit"]) || undefined;

  return {
    name,
    shortName,
    logoUrl,
    logoWidth,
    logoHeight,
    logoFit,
  };
}