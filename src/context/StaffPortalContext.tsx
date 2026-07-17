"use client";

import React from "react";
import type { MockEmployee } from "@/lib/mock-data-interfaces";
import { STAFF_PORTAL_BASE } from "@/lib/staff-portal";
import { StaffPortalContext } from "@/context/staff-portal-context-state";

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
