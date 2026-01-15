"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  BarChart,
  Settings,
  Menu,
  Landmark,
  PiggyBank,
  CalendarDays,
  LineChart,
  Clock,
  ListTodo,
  User as UserIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { getBranding } from "@/config/branding";
import LogoBrand from "@/components/LogoBrand";

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  badgeCount?: number;
  iconColor?: string;
  activeAccentColor?: string;
}

const NavLink: React.FC<NavLinkProps> = ({
  to,
  icon: Icon,
  label,
  isCollapsed,
  badgeCount,
  iconColor = "text-muted-foreground",
  activeAccentColor = "border-primary",
}) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "justify-start group rounded-lg",
        isCollapsed ? "h-9 w-9 p-1.5" : "w-full px-4 py-2",
        isActive ? "bg-white/40 hover:bg-white/50 dark:bg-white/10 dark:hover:bg-white/15" : "hover:bg-transparent"
      )}
    >
      <Link
        to={to}
        className={cn(
          "flex items-center w-full rounded-md transition-colors",
          isActive ? `border-l-2 ${activeAccentColor} pl-3` : ""
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-transform duration-200 drop-shadow-sm",
            iconColor,
            !isCollapsed && "mr-3",
            "group-hover:scale-110"
          )}
        />
        <span className={cn("flex-1 whitespace-nowrap", isCollapsed && "hidden")}>
          {label}
        </span>
        {badgeCount !== undefined && badgeCount > 0 && !isCollapsed && (
          <Badge className="ml-auto h-5 w-5 flex items-center justify-center p-0">
            {badgeCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  companyDetails: MockCompanyDetails | null;
  isMockDataEnabled: boolean;
  pendingToDosCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  companyDetails,
  isMockDataEnabled,
  pendingToDosCount,
}) => {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();

  const displayCompanyDetails = React.useMemo(() => {
    const b = getBranding();
    return {
      name: companyDetails?.companyTradingName || companyDetails?.companyLegalName || b.name || "Your Company Name",
      logoUrl: companyDetails?.logoUrl || b.logoUrl,
      logoWidth: companyDetails?.logoWidth || b.logoWidth || 120,
      logoHeight: companyDetails?.logoHeight || b.logoHeight || 48,
      logoFit: (companyDetails?.logoFit as any) || b.logoFit || "contain",
    };
  }, [companyDetails]);

  const navItems: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
    badgeCount?: number;
    iconColor: string;
    activeAccentColor: string;
  }> = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", iconColor: "text-sky-600 dark:text-sky-400", activeAccentColor: "border-sky-500" },
    { to: "/profile", icon: UserIcon, label: "My Profile", iconColor: "text-gray-700 dark:text-gray-300", activeAccentColor: "border-gray-500" },
    { to: "/todos", icon: ListTodo, label: "To-Dos", badgeCount: pendingToDosCount, iconColor: "text-rose-600 dark:text-rose-400", activeAccentColor: "border-rose-500" },
    { to: "/employees", icon: Users, label: "Employees", iconColor: "text-teal-600 dark:text-teal-400", activeAccentColor: "border-teal-500" },
    { to: "/timesheet", icon: Clock, label: "Timesheet", iconColor: "text-amber-600 dark:text-amber-400", activeAccentColor: "border-amber-500" },
    { to: "/payslips/overview", icon: ReceiptText, label: "Payslips", iconColor: "text-violet-600 dark:text-violet-400", activeAccentColor: "border-violet-500" },
    { to: "/payroll/runs", icon: ReceiptText, label: "Payroll Runs", iconColor: "text-purple-600 dark:text-purple-400", activeAccentColor: "border-purple-500" },
    { to: "/payroll/batches", icon: Landmark, label: "Payment Batches", iconColor: "text-green-700 dark:text-green-300", activeAccentColor: "border-green-600" },
    { to: "/savings", icon: PiggyBank, label: "Savings", iconColor: "text-emerald-600 dark:text-emerald-400", activeAccentColor: "border-emerald-500" },
    { to: "/vacation-absence", icon: CalendarDays, label: "Vacation & Absence", iconColor: "text-fuchsia-600 dark:text-fuchsia-400", activeAccentColor: "border-fuchsia-500" },
    { to: "/analytics", icon: LineChart, label: "Analytics", iconColor: "text-indigo-600 dark:text-indigo-400", activeAccentColor: "border-indigo-500" },
    { to: "/reports", icon: BarChart, label: "Reports", iconColor: "text-blue-600 dark:text-blue-400", activeAccentColor: "border-blue-500" },
    { to: "/settings", icon: Settings, label: "Settings", iconColor: "text-orange-600 dark:text-orange-400", activeAccentColor: "border-orange-500" },
  ];

  const renderSidebarHeader = (currentIsCollapsed: boolean, toggleCollapse: (collapsed: boolean) => void) => (
    <div
      className={cn(
        "relative overflow-hidden",
        currentIsCollapsed ? "h-20" : "h-28"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-sky-300 via-indigo-400 to-fuchsia-500" />
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className={cn("relative z-10 flex items-center border-b px-4 lg:px-6", currentIsCollapsed ? "justify-center" : "justify-between py-5 lg:py-7 text-white")}>
        {currentIsCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleCollapse(!currentIsCollapsed)}
            className="mx-auto bg-white/20 hover:bg-white/30 z-10"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-white" />
          </Button>
        ) : (
          <>
            <Link to="/" className="flex flex-col items-center flex-grow-0">
              <LogoBrand
                size="md"
                align="center"
                showName
                name={displayCompanyDetails.name}
                logoUrl={displayCompanyDetails.logoUrl || "/logonscreen_for_workflow.png"}
                logoWidthPx={displayCompanyDetails.logoWidth}
                logoHeightPx={displayCompanyDetails.logoHeight}
                logoFit={displayCompanyDetails.logoFit}
              />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleCollapse(!currentIsCollapsed)}
              className="ml-auto bg-white/20 hover:bg-white/30 z-10"
              aria-label="Collapse sidebar"
            >
              <Menu className="h-5 w-5 text-white" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  if (isLoadingAuth || !isAuthenticated) {
    return null;
  }

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50" aria-label="Open sidebar">
            <Menu className="h-6 w-6 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar text-sidebar-foreground">
            {renderSidebarHeader(false, setIsCollapsed)}
            <nav className="grid items-start gap-1 p-4">
              {navItems
                .filter((item) => {
                  if (item.to === "/employees" || item.to === "/analytics" || item.to === "/reports" || item.to === "/payroll/runs" || item.to === "/payroll/batches") {
                    return user?.role === "Admin" || user?.role === "Manager";
                  }
                  if (item.to === "/settings") {
                    return user?.role === "Admin";
                  }
                  return true;
                })
                .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  isCollapsed={false}
                  badgeCount={item.badgeCount}
                  iconColor={item.iconColor}
                  activeAccentColor={item.activeAccentColor}
                />
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full max-h-screen flex-col gap-2 border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-[70px] overflow-x-hidden" : "w-[260px]"
      )}
    >
      {renderSidebarHeader(isCollapsed, setIsCollapsed)}
      <nav className="grid items-start gap-1 p-4">
        {navItems
          .filter((item) => {
            if (item.to === "/employees" || item.to === "/analytics" || item.to === "/reports" || item.to === "/payroll/runs" || item.to === "/payroll/batches") {
              return user?.role === "Admin" || user?.role === "Manager";
            }
            if (item.to === "/settings") {
              return user?.role === "Admin";
            }
            return true;
          })
          .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isCollapsed={isCollapsed}
            badgeCount={item.badgeCount}
            iconColor={item.iconColor}
            activeAccentColor={item.activeAccentColor}
          />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;