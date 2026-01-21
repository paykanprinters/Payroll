"use client";

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react'; // Import Loader2 icon

interface ProtectedRouteProps {
  allowedRoles?: ('Admin' | 'Manager' | 'Staff' | 'Viewer')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const portalType = (import.meta.env.VITE_PORTAL || "admin").toLowerCase();
  const staffPortalUrl = import.meta.env.VITE_STAFF_PORTAL_URL as string | undefined;
  const adminPortalUrl = import.meta.env.VITE_ADMIN_PORTAL_URL as string | undefined;

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

  // Cross-portal enforcement: redirect users to the correct portal domain
  if (user) {
    if (portalType === "admin" && user.role === "Staff" && staffPortalUrl) {
      // Staff in admin build → send to staff portal domain
      window.location.href = staffPortalUrl;
      return null;
    }
    if (portalType === "staff" && (user.role === "Admin" || user.role === "Manager") && adminPortalUrl) {
      // Admin/Manager in staff build → send to admin portal domain
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