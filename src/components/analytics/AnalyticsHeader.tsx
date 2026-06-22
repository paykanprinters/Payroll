"use client";

import React from "react";
import { LineChart as LineChartIcon, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePayrollProcessor } from "@/context/PayrollDataContext";

interface AnalyticsHeaderProps {
  variant?: "admin" | "staff";
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  variant = "admin",
  onRefresh,
  isRefreshing = false,
}) => {
  const { companyDetails } = usePayrollProcessor();
  const companyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company";

  return (
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <LineChartIcon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white/70">{companyName}</p>
            <h1 className="text-2xl font-bold leading-tight text-white md:text-3xl">
              {variant === "staff" ? "My analytics" : "Payroll analytics"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              {variant === "staff"
                ? "Personal payslip, deduction, and leave trends from your own records."
                : "Workforce cost trends, deductions, leave patterns, and platform health."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          )}
          {variant === "admin" && (
            <Link
              to="/reports"
              className={cn(
                buttonVariants({ size: "sm" }),
                "rounded-full bg-white text-cyan-900 hover:bg-white/90"
              )}
            >
              Open reports
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsHeader;
