"use client";

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStaffEmployee } from "@/hooks/use-staff-employee";
import { StaffPortalProvider } from "@/context/StaffPortalContext";
import StaffPortalAccessDenied from "@/components/staff/StaffPortalAccessDenied";
import { STAFF_LOGIN_PATH } from "@/lib/staff-portal";

const StaffPortalGuard: React.FC = () => {
  const { employee, status } = useStaffEmployee();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/40 to-fuchsia-50/30">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to={STAFF_LOGIN_PATH} replace state={{ from: location.pathname }} />;
  }

  if (status === "no_link") {
    return <StaffPortalAccessDenied reason="not_linked" />;
  }

  if (status === "no_access") {
    return <StaffPortalAccessDenied reason="portal_disabled" />;
  }

  if (!employee) {
    return <StaffPortalAccessDenied reason="not_linked" />;
  }

  return (
    <StaffPortalProvider employee={employee}>
      <Outlet />
    </StaffPortalProvider>
  );
};

export default StaffPortalGuard;
