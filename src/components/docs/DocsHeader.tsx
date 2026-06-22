"use client";

import React from "react";
import { BookOpen, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/context/PayrollDataContext";

interface DocsHeaderProps {
  onRefresh?: () => void;
}

const DocsHeader: React.FC<DocsHeaderProps> = ({ onRefresh }) => {
  const { user } = useAuth();
  const { companyDetails, isMockDataEnabled } = usePayrollProcessor();

  const companyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company";

  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/70">{companyName}</p>
            <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">
              Documentation
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              How the payroll system works, step-by-step workflows, and role-based guidance for
              daily use.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          )}
          <Badge className="bg-white/15 text-white hover:bg-white/20">
            Signed in: {user?.role || "User"}
          </Badge>
          {isMockDataEnabled && (
            <Badge variant="outline" className="border-white/30 bg-white/10 text-white">
              Mock data
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocsHeader;
