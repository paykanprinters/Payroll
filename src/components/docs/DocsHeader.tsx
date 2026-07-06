"use client";

import React from "react";
import { BookOpen, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import KanPageBanner from "@/components/KanPageBanner";

interface DocsHeaderProps {
  onRefresh?: () => void;
}

const DocsHeader: React.FC<DocsHeaderProps> = ({ onRefresh }) => {
  const { user } = useAuth();
  const { isMockDataEnabled } = usePayrollProcessor();

  return (
    <KanPageBanner
      icon={BookOpen}
      title="Documentation & training"
      description="Training manuals for onboarding, reference guides for daily use, and role-based workflows."
      actions={
        <>
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
        </>
      }
    />
  );
};

export default DocsHeader;
