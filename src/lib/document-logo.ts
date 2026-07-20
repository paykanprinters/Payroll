import { KAN_BRAND } from "@/config/branding";

/** Sensible defaults for payslip / report PDF headers */
export const DOCUMENT_LOGO_WIDTH = 180;
export const DOCUMENT_LOGO_HEIGHT = 60;
export const DOCUMENT_LOGO_FIT = "contain" as const;

const DEFAULT_APP_ORIGIN =
  (typeof import.meta !== "undefined" &&
    (import.meta.env as Record<string, string | undefined>).VITE_PUBLIC_APP_URL) ||
  "https://payroll-beta-orcin.vercel.app";

/** Resolve a logo path for HTML previews and react-pdf (needs absolute http(s) or data URLs). */
export function resolveDocumentLogoUrl(url?: string | null): string | undefined {
  const candidate = (url && url.trim()) || KAN_BRAND.logoUrlLight;
  if (!candidate) return undefined;
  if (/^(https?:|data:)/i.test(candidate)) return candidate;

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : DEFAULT_APP_ORIGIN.replace(/\/$/, "");

  return `${origin}${candidate.startsWith("/") ? candidate : `/${candidate}`}`;
}

export function resolveDocumentLogoDimensions(
  width?: number | null,
  height?: number | null,
  fit?: string | null
): { width: number; height: number; fit: typeof DOCUMENT_LOGO_FIT } {
  return {
    width: typeof width === "number" && width > 0 ? width : DOCUMENT_LOGO_WIDTH,
    height: typeof height === "number" && height > 0 ? height : DOCUMENT_LOGO_HEIGHT,
    fit: (fit as typeof DOCUMENT_LOGO_FIT) || DOCUMENT_LOGO_FIT,
  };
}

/** Public Supabase storage object for payslips/reports (seeded by seed-company-branding). */
export function getDefaultCompanyLogoStorageUrl(supabaseUrl?: string): string {
  const base =
    supabaseUrl ||
    (typeof import.meta !== "undefined" &&
      (import.meta.env as Record<string, string | undefined>).VITE_SUPABASE_URL) ||
    "https://uabjnuelajfidkgxwjyw.supabase.co";
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/company-logos/company_logo.png`;
}

export function resolvePayslipLogoSource(
  payslipLogoUrl?: string | null,
  companyLogoUrl?: string | null,
  snapshotLogoUrl?: string | null
): string | undefined {
  return resolveDocumentLogoUrl(payslipLogoUrl || companyLogoUrl || snapshotLogoUrl);
}

export function resolveCompanyLogoSource(companyLogoUrl?: string | null): string | undefined {
  return resolveDocumentLogoUrl(companyLogoUrl);
}

/**
 * Report header logo size: Report Design settings override Company Details when set.
 */
export function resolveReportLogoDimensions(
  report?: {
    reportLogoWidth?: number | null;
    reportLogoHeight?: number | null;
    reportLogoFit?: string | null;
  } | null,
  company?: {
    logoWidth?: number | null;
    logoHeight?: number | null;
    logoFit?: string | null;
  } | null
): { width: number; height: number; fit: typeof DOCUMENT_LOGO_FIT } {
  return resolveDocumentLogoDimensions(
    report?.reportLogoWidth ?? company?.logoWidth,
    report?.reportLogoHeight ?? company?.logoHeight,
    report?.reportLogoFit ?? company?.logoFit
  );
}
