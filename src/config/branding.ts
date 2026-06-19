"use client";

export type BrandingConfig = {
  name?: string;
  shortName?: string;
  tagline?: string;
  logoUrl?: string;
  logoUrlLight?: string;
  logoUrlDark?: string;
  iconUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
};

/** Kan Printers & Promo — CMYK brand palette */
export const KAN_BRAND = {
  name: "Kan Printers & Promo",
  shortName: "Kan Printers",
  tagline: "KAN DO IT — since 2000",
  logoUrl: "/brand/kanprinters_horizontal_color.svg",
  logoUrlLight: "/brand/kanprinters_horizontal_color.svg",
  logoUrlDark: "/brand/kanprinters_horizontal_dark.svg",
  iconUrl: "/brand/kanprinters_icon_color.svg",
  logoWidth: 220,
  logoHeight: 64,
  logoFit: "contain" as const,
  /** Compact horizontal logo for the narrow sidebar header */
  sidebarLogoUrl: "/brand/kanprinters_horizontal_dark.svg",
  sidebarLogoHeight: 40,
  colors: {
    panel: "#141414",
    magenta: "#EC008C",
    cyan: "#00AEEF",
    yellow: "#FFDE00",
    red: "#E62229",
    text: "#141414",
    muted: "#6b6b6b",
  },
};

const DEFAULTS: Required<
  Pick<
    BrandingConfig,
    "name" | "shortName" | "tagline" | "logoUrl" | "logoUrlLight" | "logoUrlDark" | "iconUrl" | "logoWidth" | "logoHeight" | "logoFit"
  >
> = {
  name: KAN_BRAND.name,
  shortName: KAN_BRAND.shortName,
  tagline: KAN_BRAND.tagline,
  logoUrl: KAN_BRAND.logoUrl,
  logoUrlLight: KAN_BRAND.logoUrlLight,
  logoUrlDark: KAN_BRAND.logoUrlDark,
  iconUrl: KAN_BRAND.iconUrl,
  logoWidth: KAN_BRAND.logoWidth,
  logoHeight: KAN_BRAND.logoHeight,
  logoFit: KAN_BRAND.logoFit,
};

export const SIDEBAR_LOGO_FALLBACK = KAN_BRAND.sidebarLogoUrl;
export const SIDEBAR_LOGO_HEIGHT = KAN_BRAND.sidebarLogoHeight;

export function getBranding(): BrandingConfig {
  const env = import.meta.env as Record<string, string | undefined>;

  const logoWidthRaw = env.VITE_COMPANY_LOGO_WIDTH;
  const logoHeightRaw = env.VITE_COMPANY_LOGO_HEIGHT;
  const logoFitRaw = env.VITE_COMPANY_LOGO_FIT;

  return {
    name: env.VITE_COMPANY_NAME || DEFAULTS.name,
    shortName: env.VITE_COMPANY_SHORT_NAME || DEFAULTS.shortName,
    tagline: env.VITE_COMPANY_TAGLINE || DEFAULTS.tagline,
    logoUrl: env.VITE_COMPANY_LOGO_URL || DEFAULTS.logoUrl,
    logoUrlLight: env.VITE_COMPANY_LOGO_URL_LIGHT || DEFAULTS.logoUrlLight,
    logoUrlDark: env.VITE_COMPANY_LOGO_URL_DARK || DEFAULTS.logoUrlDark,
    iconUrl: env.VITE_COMPANY_ICON_URL || DEFAULTS.iconUrl,
    logoWidth: logoWidthRaw != null ? Number(logoWidthRaw) : DEFAULTS.logoWidth,
    logoHeight: logoHeightRaw != null ? Number(logoHeightRaw) : DEFAULTS.logoHeight,
    logoFit: (logoFitRaw as BrandingConfig["logoFit"]) || DEFAULTS.logoFit,
  };
}

/** Prefer company settings from localStorage, then env defaults. */
export function resolveStoredBranding(): Required<
  Pick<BrandingConfig, "name" | "logoUrl" | "logoWidth" | "logoHeight" | "logoFit" | "tagline">
> & { logoUrlDark: string } {
  const b = getBranding();

  const lsName =
    (typeof window !== "undefined" &&
      (localStorage.getItem("companyTradingName") || localStorage.getItem("companyLegalName"))) ||
    null;
  const lsLogoUrl = (typeof window !== "undefined" && localStorage.getItem("companyLogoUrl")) || null;
  const lsLogoWidthRaw = (typeof window !== "undefined" && localStorage.getItem("companyLogoWidth")) || null;
  const lsLogoHeightRaw = (typeof window !== "undefined" && localStorage.getItem("companyLogoHeight")) || null;
  const lsLogoFitRaw = (typeof window !== "undefined" && localStorage.getItem("companyLogoFit")) || null;

  return {
    name: lsName || b.name || DEFAULTS.name,
    tagline: b.tagline || DEFAULTS.tagline,
    logoUrl: lsLogoUrl || b.logoUrlDark || DEFAULTS.logoUrlDark,
    logoUrlDark: b.logoUrlDark || DEFAULTS.logoUrlDark,
    logoWidth: lsLogoWidthRaw ? Number(lsLogoWidthRaw) : b.logoWidth ?? DEFAULTS.logoWidth,
    logoHeight: lsLogoHeightRaw ? Number(lsLogoHeightRaw) : b.logoHeight ?? DEFAULTS.logoHeight,
    logoFit: (lsLogoFitRaw as BrandingConfig["logoFit"]) || b.logoFit || DEFAULTS.logoFit,
  };
}

/** Supabase Auth UI variable overrides — pass with `appearance` alongside ThemeSupa. */
export const authUiVariables = {
  default: {
    colors: {
      brand: KAN_BRAND.colors.magenta,
      brandAccent: KAN_BRAND.colors.magenta,
      brandButtonText: "white",
      defaultButtonBackground: KAN_BRAND.colors.magenta,
      defaultButtonBackgroundHover: "#c40075",
    },
    radii: {
      borderRadiusButton: "0.75rem",
      inputBorderRadius: "0.75rem",
    },
  },
};
