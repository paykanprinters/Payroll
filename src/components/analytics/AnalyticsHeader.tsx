"use client";

import React from "react";
import { LineChart as LineChartIcon, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import KanPageBanner from "@/components/KanPageBanner";

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
  return (
    <KanPageBanner
      icon={LineChartIcon}
      title={variant === "staff" ? "My analytics" : "Payroll analytics"}
      description={
        variant === "staff"
          ? "Personal payslip, deduction, and leave trends from your own records."
          : "Workforce cost trends, deductions, leave patterns, and platform health."
      }
      actions={
        <>
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
        </>
      }
    />
  );
};

export default AnalyticsHeader;
