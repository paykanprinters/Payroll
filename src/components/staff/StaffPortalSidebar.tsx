"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ReceiptText,
  CalendarDays,
  PiggyBank,
  HandCoins,
  User,
  Menu,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { staffPortalPath } from "@/lib/staff-portal";
import BrandLogo from "@/components/brand/BrandLogo";
import { getBranding } from "@/config/branding";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { to: staffPortalPath(), icon: LayoutDashboard, label: "Home", end: true },
  { to: staffPortalPath("payslips"), icon: ReceiptText, label: "Payslips" },
  { to: staffPortalPath("leave"), icon: CalendarDays, label: "Leave" },
  { to: staffPortalPath("savings"), icon: PiggyBank, label: "Savings" },
  { to: staffPortalPath("loans"), icon: HandCoins, label: "Loans" },
  { to: staffPortalPath("profile"), icon: User, label: "My profile" },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="grid gap-1">
      {NAV_ITEMS.map((item) => {
        const { to, icon: Icon, label } = item;
        const end = "end" in item ? item.end : false;
        const active = end
          ? location.pathname === to
          : location.pathname === to || location.pathname.startsWith(`${to}/`);

        return (
          <Button
            key={to}
            asChild
            variant="ghost"
            className={cn(
              "h-11 w-full justify-start rounded-xl px-3 font-medium",
              active
                ? "bg-cyan-600 text-white hover:bg-cyan-600 hover:text-white shadow-sm"
                : "text-slate-700 hover:bg-cyan-50 hover:text-cyan-900"
            )}
            onClick={onNavigate}
          >
            <Link to={to}>
              <Icon className={cn("mr-3 h-5 w-5", active ? "text-white" : "text-cyan-700")} />
              {label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

interface StaffPortalSidebarProps {
  onSignOut: () => void;
}

const StaffPortalSidebar: React.FC<StaffPortalSidebarProps> = ({ onSignOut }) => {
  const isMobile = useIsMobile();
  const brand = getBranding();
  const { user } = useAuth();

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="border-b border-cyan-100 bg-gradient-to-r from-cyan-600 to-fuchsia-600 px-4 py-5 text-white">
        <BrandLogo variant="sidebar" alt={brand.name} className="brightness-0 invert" />
        <div className="mt-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
          Employee portal
        </div>
        {user?.name && (
          <p className="mt-3 truncate text-sm text-white/90">{user.name}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <NavItems />
      </div>

      <div className="space-y-2 border-t border-cyan-100 p-4">
        <Button asChild variant="outline" className="w-full justify-start border-cyan-200 text-xs">
          <Link to={staffPortalPath("install")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Install mobile app
          </Link>
        </Button>
        {(user?.role === "Admin" || user?.role === "Manager") && (
          <Button asChild variant="outline" className="w-full justify-start border-cyan-200">
            <Link to="/dashboard">
              <ExternalLink className="mr-2 h-4 w-4" />
              Admin console
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:bg-red-50 hover:text-red-700"
          onClick={onSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-4 top-4 z-50 rounded-xl border-cyan-200 bg-white/90 shadow-sm backdrop-blur"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-cyan-700" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          {sidebarBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-cyan-100 bg-white md:flex md:flex-col">
      {sidebarBody}
    </aside>
  );
};

export default StaffPortalSidebar;
