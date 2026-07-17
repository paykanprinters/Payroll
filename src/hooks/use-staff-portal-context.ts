import { useContext } from "react";
import { StaffPortalContext } from "@/context/staff-portal-context-state";
import type { StaffPortalContextValue } from "@/context/staff-portal-context-state";

export function useStaffPortalContext(): StaffPortalContextValue {
  const context = useContext(StaffPortalContext);
  if (!context) {
    throw new Error("useStaffPortalContext must be used within StaffPortalProvider");
  }
  return context;
}
