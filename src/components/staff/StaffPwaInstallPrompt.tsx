"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffPwaInstall } from "@/hooks/use-staff-pwa-install";
import { staffPortalPath } from "@/lib/staff-portal";

interface StaffPwaInstallPromptProps {
  variant?: "banner" | "card";
}

const StaffPwaInstallPrompt: React.FC<StaffPwaInstallPromptProps> = ({ variant = "banner" }) => {
  const { canInstall, isInstalled, install, isNativeApp } = useStaffPwaInstall();

  if (isNativeApp || isInstalled) return null;

  if (variant === "banner" && !canInstall) {
    return (
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
            <span>
              Install the staff app on your phone for quick access to payslips and leave.
            </span>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 border-cyan-300 bg-white">
            <Link to={staffPortalPath("install")}>Install options</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "banner" && canInstall) {
    return (
      <div className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-fuchsia-50 px-4 py-3 text-sm text-cyan-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
            <span>Install Kan Printers Staff on this device for one-tap access.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => void install()}>
              Install app
            </Button>
            <Button asChild variant="outline" size="sm" className="border-cyan-300 bg-white">
              <Link to={staffPortalPath("install")}>More options</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StaffPwaInstallPrompt;
