import { Capacitor } from "@capacitor/core";
import { STAFF_PORTAL_BASE } from "@/lib/staff-portal";

/** True when running inside the Capacitor Android/iOS shell. */
export function isNativeStaffApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** True when launched from an installed PWA (Add to Home screen). */
export function isStandaloneStaffPwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isStaffMobileShell(): boolean {
  return isNativeStaffApp() || isStandaloneStaffPwa();
}

export function staffApkDownloadPath(): string {
  return "/downloads/kan-printers-staff.apk";
}

export const STAFF_PWA_MANIFEST_ID = "co.za.kanprinters.payroll.staff";

export function isStaffPortalRoute(pathname: string): boolean {
  return pathname === STAFF_PORTAL_BASE || pathname.startsWith(`${STAFF_PORTAL_BASE}/`);
}
