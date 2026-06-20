import { useLocation } from "react-router-dom";
import { isStaffPortalPath } from "@/lib/staff-portal";

export function useIsStaffPortal(): boolean {
  const { pathname } = useLocation();
  return isStaffPortalPath(pathname);
}
