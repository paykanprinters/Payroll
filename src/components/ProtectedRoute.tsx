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

  console.log("ProtectedRoute Debug: isAuthenticated:", isAuthenticated, "isLoadingAuth:", isLoadingAuth, "user:", user);

  if (isLoadingAuth) {
    console.log("ProtectedRoute Debug: Rendering loader.");
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("ProtectedRoute Debug: Not authenticated, navigating to /login.");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    console.log("ProtectedRoute Debug: User not authorized, navigating to /dashboard.");
    // User is authenticated but not authorized for this route
    return <Navigate to="/dashboard" replace />; // Or a dedicated /unauthorized page
  }

  console.log("ProtectedRoute Debug: Authenticated and authorized, rendering Outlet.");
  return <Outlet />;
};

export default ProtectedRoute;