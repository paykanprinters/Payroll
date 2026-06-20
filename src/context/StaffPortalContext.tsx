"use client";

import React, { createContext, useContext } from "react";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { STAFF_PORTAL_BASE } from "@/lib/staff-portal";

type StaffPortalContextValue = {
  employee: MockEmployee;
  basePath: string;
};

const StaffPortalContext = createContext<StaffPortalContextValue | null>(null);

export function StaffPortalProvider({
  employee,
  children,
}: {
  employee: MockEmployee;
  children: React.ReactNode;
}) {
  return (
    <StaffPortalContext.Provider value={{ employee, basePath: STAFF_PORTAL_BASE }}>
      {children}
    </StaffPortalContext.Provider>
  );
}

export function useStaffPortalContext(): StaffPortalContextValue {
  const ctx = useContext(StaffPortalContext);
  if (!ctx) {
    throw new Error("useStaffPortalContext must be used within StaffPortalProvider");
  }
  return ctx;
}
