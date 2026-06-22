"use client";

import React from "react";
import { FileText, RefreshCcw, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import KanPageBanner from "@/components/KanPageBanner";

interface ReportsHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const ReportsHeader: React.FC<ReportsHeaderProps> = ({ onRefresh, isRefreshing = false }) => {
  return (
    <KanPageBanner
      icon={FileText}
      title="Payroll reports"
      description="Generate audit-ready registers, statutory summaries, and payment schedules with PDF export."
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
              Refresh data
            </Button>
          )}
          <Link
            to="/settings/report-design"
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-full bg-white text-cyan-900 hover:bg-white/90"
            )}
          >
            <Palette className="h-4 w-4" />
            Report design
          </Link>
        </>
      }
    />
  );
};

export default ReportsHeader;
