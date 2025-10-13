"use client";

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('Admin' | 'Manager' | 'Staff' | 'Viewer')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but not authorized for this route
    // Redirect to dashboard or an unauthorized page
    return <Navigate to="/dashboard" replace />; // Or a dedicated /unauthorized page
  }

  return <Outlet />;
};

export default ProtectedRoute;