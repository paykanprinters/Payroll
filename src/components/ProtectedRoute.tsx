"use client";

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from 'lucide-react';
import { isStaffPortalPath, staffPortalPath } from '@/lib/staff-portal';

interface ProtectedRouteProps {
  allowedRoles?: ('Admin' | 'Manager' | 'Staff' | 'Viewer')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const location = useLocation();
  const portalType = (import.meta.env.VITE_PORTAL || "admin").toLowerCase();
  const staffPortalUrl = import.meta.env.VITE_STAFF_PORTAL_URL as string | undefined;
  const adminPortalUrl = import.meta.env.VITE_ADMIN_PORTAL_URL as string | undefined;
  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const isEmbedded = (() => {
    if (typeof window === "undefined") return false;
    try {
      return window.self !== window.top;
    } catch {
      // If we can't access window.top due to cross-origin restrictions, assume embedded.
      return true;
    }
  })();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Staff users belong on the employee portal, not the admin console.
  if (user?.role === "Staff" && portalType === "admin" && !isStaffPortalPath(location.pathname)) {
    if (!isLocalhost && !isEmbedded && staffPortalUrl) {
      window.location.href = staffPortalUrl;
      return null;
    }
    return <Navigate to={staffPortalPath()} replace />;
  }

  // Cross-portal enforcement across separate domains (optional env URLs)
  if (!isLocalhost && !isEmbedded && user) {
    if (portalType === "staff" && (user.role === "Admin" || user.role === "Manager") && adminPortalUrl) {
      window.location.href = adminPortalUrl;
      return null;
    }
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but not authorized for this route
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;