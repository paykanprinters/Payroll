"use client";

import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const sidebarNavItems = [
  {
    title: "Company Details",
    href: "/settings/company-details",
  },
  {
    title: "Biometric Devices",
    href: "/settings/biometric-devices",
  },
  {
    title: "Tax Liabilities",
    href: "/settings/tax-liabilities",
  },
  {
    title: "Payslip Design",
    href: "/settings/payslip-design",
  },
  {
    title: "Report Design", // New sub-menu item
    href: "/settings/report-design",
  },
  {
    title: "Mock Data",
    href: "/settings/mock-data",
  },
  {
    title: "Data Visuals", // New sub-menu item
    href: "/settings/data-visuals",
  },
  // Add more settings sub-menus here
];

const SettingsLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="space-y-6 p-4 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  location.pathname === item.href
                    ? "bg-muted hover:bg-muted"
                    : "hover:bg-transparent hover:underline",
                  "justify-start"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-2xl">
          <Outlet /> {/* This is where nested routes will render */}
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;