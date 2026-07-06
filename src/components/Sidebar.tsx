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
  BookOpen,
  Boxes,
  Link2,
  AlertTriangle,
  ClipboardList,
  HandCoins,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { getBranding, SIDEBAR_LOGO_FALLBACK, SIDEBAR_LOGO_HEIGHT } from "@/config/branding";
import BrandLogo from "@/components/brand/BrandLogo";

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  badgeCount?: number;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isCollapsed, badgeCount }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "group w-full justify-start rounded-xl px-3 py-2 text-sidebar-foreground/90 hover:bg-white/5 hover:text-sidebar-foreground",
        isCollapsed ? "h-10 w-10 justify-center p-0" : ""
      )}
    >
      <Link
        to={to}
        className={cn(
          "flex w-full items-center rounded-xl transition-colors",
          isActive && !isCollapsed ? "bg-white/10" : "",
          isActive && !isCollapsed ? "border-l-2 border-sidebar-primary pl-3" : ""
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70",
            !isCollapsed && "mr-3",
            "group-hover:scale-110"
          )}
        />
        <span className={cn("flex-1 whitespace-nowrap text-sm", isCollapsed && "hidden")}>
          {label}
        </span>
        {badgeCount !== undefined && badgeCount > 0 && !isCollapsed && (
          <Badge className="ml-auto h-5 min-w-5 justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
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
  pendingToDosCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  companyDetails,
  pendingToDosCount,
}) => {
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();

  const [logoError, setLogoError] = React.useState(false);

  const displayCompanyDetails = React.useMemo(() => {
    const b = getBranding();

    return {
      name: companyDetails?.companyTradingName || companyDetails?.companyLegalName || b.name || "Kan Printers & Promo",
      shortName: b.shortName || "Kan Printers",
      sidebarLogoHeight: SIDEBAR_LOGO_HEIGHT,
    };
  }, [companyDetails]);

  const navSections: Array<{
    title: string;
    items: Array<{ to: string; icon: React.ElementType; label: string; badgeCount?: number }>;
  }> = [
    {
      title: "Workspace",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/todos", icon: ListTodo, label: "To-Dos", badgeCount: pendingToDosCount },
      ],
    },
    {
      title: "People",
      items: [
        { to: "/employees", icon: Users, label: "Employees" },
        { to: "/timesheet", icon: Clock, label: "Timesheet" },
        { to: "/vacation-absence", icon: CalendarDays, label: "Vacation & Absence" },
        { to: "/savings", icon: PiggyBank, label: "Savings" },
        { to: "/loans-advancements", icon: HandCoins, label: "Loans" },
      ],
    },
    {
      title: "Payroll",
      items: [
        { to: "/payslips/overview", icon: ReceiptText, label: "Payslips" },
        { to: "/payroll/runs", icon: ClipboardList, label: "Payroll Runs" },
        { to: "/payroll/batches", icon: Landmark, label: "Payment Batches" },
      ],
    },
    {
      title: "Payroll setup",
      items: [
        { to: "/payroll/components", icon: Boxes, label: "Components" },
        { to: "/payroll/assignments", icon: Link2, label: "Assignments" },
        { to: "/payroll/overtime-rules", icon: Clock, label: "Overtime Rules" },
        { to: "/payroll/exceptions", icon: AlertTriangle, label: "Exceptions" },
      ],
    },
    {
      title: "Insights",
      items: [
        { to: "/analytics", icon: LineChart, label: "Analytics" },
        { to: "/reports", icon: BarChart, label: "Reports" },
      ],
    },
    {
      title: "Account",
      items: [
        { to: "/profile", icon: UserIcon, label: user?.role === "Staff" ? "My Profile" : "My Account" },
        { to: "/docs", icon: BookOpen, label: "Docs" },
        { to: "/settings", icon: Settings, label: "Settings" },
      ],
    },
  ];

  // Role filtering (kept centralized)
  const filteredSections = navSections
    .map((section) => {
      const items = section.items.filter((item) => {
        if (user?.role === "Viewer") {
          const viewerAllowed =
            item.to === "/dashboard" ||
            item.to.startsWith("/payslips") ||
            item.to === "/analytics" ||
            item.to === "/reports" ||
            item.to === "/profile" ||
            item.to === "/docs";
          return viewerAllowed;
        }
        // Admin/Manager-only
        if (
          item.to === "/employees" ||
          item.to === "/vacation-absence" ||
          item.to === "/analytics" ||
          item.to === "/reports" ||
          item.to.startsWith("/payroll/")
        ) {
          return user?.role === "Admin" || user?.role === "Manager";
        }
        // Admin-only
        if (item.to === "/settings") {
          return user?.role === "Admin";
        }
        return true;
      });

      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);

  const renderSidebarHeader = (currentIsCollapsed: boolean, toggleCollapse: (collapsed: boolean) => void) => {
    const sidebarLogoSrc = logoError ? SIDEBAR_LOGO_FALLBACK : undefined;

    return (
    <div className={cn("relative overflow-hidden", currentIsCollapsed ? "h-[4.75rem]" : "h-[6.25rem]")}>
      <div className="absolute inset-0 bg-sidebar" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(236,0,140,0.18),transparent_55%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />

      <div
        className={cn(
          "relative z-10 flex h-full items-center px-3",
          currentIsCollapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        {currentIsCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleCollapse(!currentIsCollapsed)}
            className="bg-white/10 text-white hover:bg-white/15"
            aria-label="Toggle sidebar"
          >
            <img
              src={getBranding().iconUrl}
              alt=""
              className="h-8 w-8 rounded-md object-contain"
            />
          </Button>
        ) : (
          <>
            <Link to="/" className="min-w-0 flex-1 pr-1">
              <BrandLogo
                variant="sidebar"
                src={sidebarLogoSrc}
                alt={displayCompanyDetails.name}
                onError={() => setLogoError(true)}
              />
              <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
                Payroll
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleCollapse(!currentIsCollapsed)}
              className="shrink-0 bg-white/10 text-white hover:bg-white/15"
              aria-label="Collapse sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>
    </div>
    );
  };

  if (isLoadingAuth || !isAuthenticated) {
    return null;
  }

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-50 rounded-xl border bg-background/70 shadow-sm backdrop-blur-md"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6 text-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar text-sidebar-foreground">
            {renderSidebarHeader(false, setIsCollapsed)}
            <div className="flex-1 overflow-y-auto">
              <nav className="grid items-start gap-3 p-4 pb-8">
                {filteredSections.map((section) => (
                  <div key={section.title} className="grid gap-1">
                    <div className="px-3 text-xs font-medium text-white/60">{section.title}</div>
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        icon={item.icon}
                        label={item.label}
                        isCollapsed={false}
                        badgeCount={item.badgeCount}
                      />
                    ))}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full max-h-screen flex-col gap-2 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-[70px] overflow-x-hidden" : "w-[280px]"
      )}
    >
      {renderSidebarHeader(isCollapsed, setIsCollapsed)}
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start gap-3 p-4 pb-8">
          {filteredSections.map((section) => (
            <div key={section.title} className="grid gap-1">
              {!isCollapsed && (
                <div className="px-3 text-xs font-medium text-white/60">{section.title}</div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  isCollapsed={isCollapsed}
                  badgeCount={item.badgeCount}
                />
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;