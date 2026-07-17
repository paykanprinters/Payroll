"use client";

import React from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AnalyticsPageContent from "@/components/analytics/AnalyticsPageContent";
import { useAuth } from "@/hooks/use-auth";

const AnalyticsStaff: React.FC = () => {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "Staff") {
    return <Navigate to="/analytics" replace />;
  }

  return <AnalyticsPageContent variant="staff" staffUserId={user.id} />;
};

export default AnalyticsStaff;
