"use client";

import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import SettingsHeader from "@/components/settings/SettingsHeader";

const sidebarNavItems = [
  { title: "Company Details", href: "/settings/company-details" },
  { title: "Work Hours", href: "/settings/work-hours" },
  { title: "Pay Cycle Settings", href: "/settings/pay-cycle-settings" },
  { title: "Biometric Devices", href: "/settings/biometric-devices" },
  { title: "Tax Liabilities", href: "/settings/tax-liabilities" },
  { title: "Payslip Design", href: "/settings/payslip-design" },
  { title: "Report Design", href: "/settings/report-design" },
  { title: "Data Visuals", href: "/settings/data-visuals" },
  { title: "User Control Panel", href: "/settings/user-control-panel" },
];

const SettingsLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="space-y-6 p-4 pb-16">
      <SettingsHeader />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-1/4">
          <nav className="grid gap-2">
            {sidebarNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "justify-start rounded-full px-4",
                    isActive
                      ? "bg-white/60 backdrop-blur-md text-foreground ring-1 ring-muted hover:bg-white/70"
                      : "hover:bg-muted/30"
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 lg:max-w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;