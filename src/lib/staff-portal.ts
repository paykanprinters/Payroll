export const STAFF_PORTAL_BASE = "/staff";
export const STAFF_LOGIN_PATH = `${STAFF_PORTAL_BASE}/login`;

export function isStaffPortalPath(pathname: string): boolean {
  return pathname === STAFF_PORTAL_BASE || pathname.startsWith(`${STAFF_PORTAL_BASE}/`);
}

export function staffPortalPath(subpath = ""): string {
  if (!subpath) return STAFF_PORTAL_BASE;
  const normalized = subpath.startsWith("/") ? subpath.slice(1) : subpath;
  return `${STAFF_PORTAL_BASE}/${normalized}`;
}

export function formatRand(amount: number): string {
  return `R ${Number(amount || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
