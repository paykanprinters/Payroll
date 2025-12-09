"use client";

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  children?: React.ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Checking session…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const ok = role ? allowedRoles.includes(role) : false;
    if (!ok) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Support both wrapper and nested routes
  if (children) return <>{children}</>;
  return <Outlet />;
}