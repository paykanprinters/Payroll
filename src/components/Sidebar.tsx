"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
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
  Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { useToDosData } from "@/hooks/use-todos-data";
import { useAuth } from "@/context/AuthContext";
import { MockCompanyDetails } from "@/lib/mock-data-interfaces"; // Import MockCompanyDetails

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  badgeCount?: number;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isCollapsed, badgeCount }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "justify-start",
        isCollapsed ? "h-9 w-9 p-1.5" : "w-full px-4 py-2",
        isActive ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline"
      )}
    >
      <Link
        to={to}
        className="flex items-center w-full"
      >
        <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
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
  companyDetails: MockCompanyDetails | null; // Receive company details as prop
  isMockDataEnabled: boolean; // Receive mock data status as prop
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, companyDetails, isMockDataEnabled }) => {
  const isMobile = useIsMobile();
  const { pendingCount } = useToDosData();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // Determine which company details to display
  const displayCompanyDetails = React.useMemo(() => {
    if (isMockDataEnabled) {
      // If mock data is enabled, read from localStorage for mock company details
      const mockTradingName = localStorage.getItem('companyTradingName') || "";
      const mockLegalName = localStorage.getItem('companyLegalName') || "";
      const mockLogoUrl = localStorage.getItem('companyLogoUrl');
      const mockLogoWidth = parseFloat(localStorage.getItem('companyLogoWidth') || '100');
      const mockLogoHeight = parseFloat(localStorage.getItem('companyLogoHeight') || '50');
      const mockLogoFit = (localStorage.getItem('companyLogoFit') as MockCompanyDetails['logoFit']) || "contain";

      return {
        name: mockLegalName || mockTradingName || "Your Company Name",
        logoUrl: mockLogoUrl,
        logoWidth: isNaN(mockLogoWidth) ? 100 : mockLogoWidth,
        logoHeight: isNaN(mockLogoHeight) ? 50 : mockLogoHeight,
        logoFit: mockLogoFit,
      };
    } else if (companyDetails) {
      // Otherwise, use the Supabase-fetched company details
      return {
        name: companyDetails.companyLegalName || companyDetails.companyTradingName || "Your Company Name",
        logoUrl: companyDetails.logoUrl,
        logoWidth: companyDetails.logoWidth || 100,
        logoHeight: companyDetails.logoHeight || 50,
        logoFit: companyDetails.logoFit || "contain",
      };
    }
    return { name: "Your Company Name", logoUrl: null, logoWidth: 100, height: 50, logoFit: "contain" };
  }, [companyDetails, isMockDataEnabled]);


  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/todos", icon: ListTodo, label: "To-Dos", badgeCount: pendingCount },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/timesheet", icon: Clock, label: "Timesheet" },
    { to: "/payslips/overview", icon: ReceiptText, label: "Payslips" },
    { to: "/loans-advancements", icon: Landmark, label: "Loans & Advancements" },
    { to: "/savings", icon: PiggyBank, label: "Savings" },
    { to: "/vacation-absence", icon: CalendarDays, label: "Vacation & Absence" },
    { to: "/analytics", icon: LineChart, label: "Analytics" },
    { to: "/reports", icon: BarChart, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  // Extracted header rendering logic
  const renderSidebarHeader = (currentIsCollapsed: boolean, toggleCollapse: (collapsed: boolean) => void) => (
    <div className={cn(
      "flex items-center border-b px-4 lg:px-6",
      currentIsCollapsed ? "h-16 justify-center" : "h-24 justify-between py-4 lg:py-6"
    )}>
      {currentIsCollapsed ? (
        // When collapsed, only show the toggle button, centered
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleCollapse(!currentIsCollapsed)}
          className="mx-auto bg-gray-100 dark:bg-gray-700 z-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : (
        // When expanded, show logo/name and toggle button to the right
        <>
          <Link to="/" className="flex flex-col items-center flex-grow-0">
            {displayCompanyDetails.logoUrl && (
              <img
                src={displayCompanyDetails.logoUrl}
                alt="Company Logo"
                style={{ width: displayCompanyDetails.logoWidth, height: displayCompanyDetails.logoHeight, objectFit: displayCompanyDetails.logoFit as React.CSSProperties['objectFit'] }}
                className="mb-1"
              />
            )}
            <span className="text-lg whitespace-nowrap">{displayCompanyDetails.name}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleCollapse(!currentIsCollapsed)}
            className="ml-auto bg-gray-100 dark:bg-gray-700 z-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );

  if (isLoadingAuth || !isAuthenticated) {
    return null; // Don't render sidebar if auth is loading or not authenticated
  }

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar text-sidebar-foreground">
            {/* For mobile, renderSidebarHeader is always called with isCollapsed=false to show full menu */}
            {renderSidebarHeader(false, setIsCollapsed)}
            <nav className="grid items-start gap-1 p-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  isCollapsed={false} // Mobile nav links are never collapsed
                  badgeCount={item.badgeCount}
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
        isCollapsed ? "w-[70px] overflow-x-hidden" : "w-[240px]"
      )}
    >
      {renderSidebarHeader(isCollapsed, setIsCollapsed)} {/* Desktop uses the actual isCollapsed state */}
      <nav className="grid items-start gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isCollapsed={isCollapsed}
            badgeCount={item.badgeCount}
          />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;