"use client";

import React from "react";
import { Link } from "react-router-dom";
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
  CalendarDays, // New icon for Vacation & Absence
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ to, icon: Icon, label, isCollapsed }) => (
  <Button
    asChild
    variant="ghost"
    className={cn(
      "w-full justify-start",
      isCollapsed ? "h-9 w-9 p-0" : "px-4 py-2"
    )}
  >
    <Link to={to}>
      <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
      {!isCollapsed && label}
    </Link>
  </Button>
);

const Sidebar: React.FC = () => {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  // Initialize states directly from localStorage for immediate display
  const [companyTradingName, setCompanyTradingName] = React.useState<string>(
    localStorage.getItem('companyTradingName') || ""
  );
  const [companyLegalName, setCompanyLegalName] = React.useState<string>(
    localStorage.getItem('companyLegalName') || ""
  );
  const [companyLogoUrl, setCompanyLogoUrl] = React.useState<string | null>(
    localStorage.getItem('companyLogoUrl')
  );
  const [companyLogoSize, setCompanyLogoSize] = React.useState<number>(
    parseFloat(localStorage.getItem('companyLogoSize') || '40')
  );

  React.useEffect(() => {
    const updateCompanyDetails = () => {
      const tradingName = localStorage.getItem('companyTradingName');
      const legalName = localStorage.getItem('companyLegalName');

      // Update state only if values have changed to avoid unnecessary re-renders
      if ((tradingName || "") !== companyTradingName) { // Compare with current state
        setCompanyTradingName(tradingName && tradingName.trim() !== '' ? tradingName : "");
      }
      if ((legalName || "") !== companyLegalName) { // Compare with current state
        setCompanyLegalName(legalName && legalName.trim() !== '' ? legalName : "");
      }

      const logo = localStorage.getItem('companyLogoUrl');
      if ((logo || null) !== companyLogoUrl) { // Compare with current state
        setCompanyLogoUrl(logo && logo.trim() !== '' ? logo : null);
      }

      const sizeStr = localStorage.getItem('companyLogoSize');
      const newSize = parseFloat(sizeStr || '40');
      if ((isNaN(newSize) ? 40 : newSize) !== companyLogoSize) { // Compare with current state
        setCompanyLogoSize(isNaN(newSize) ? 40 : newSize);
      }
      
      console.log("Sidebar: Received update. Current localStorage values:", { tradingName, legalName, logo, newSize });
    };

    window.addEventListener('companyDetailsUpdated', updateCompanyDetails);
    window.addEventListener('mockDataUpdated', updateCompanyDetails);
    // Call on mount to ensure initial state reflects current localStorage, even if already initialized
    updateCompanyDetails(); 
    
    return () => {
      window.removeEventListener('companyDetailsUpdated', updateCompanyDetails);
      window.removeEventListener('mockDataUpdated', updateCompanyDetails);
    };
  }, [companyTradingName, companyLegalName, companyLogoUrl, companyLogoSize]); // Add dependencies to useEffect

  const displayCompanyName = companyTradingName || companyLegalName || "Your Company Name";

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/payslips", icon: ReceiptText, label: "Payslips" },
    { to: "/loans-advancements", icon: Landmark, label: "Loans & Advancements" },
    { to: "/savings", icon: PiggyBank, label: "Savings" },
    { to: "/vacation-absence", icon: CalendarDays, label: "Vacation & Absence" }, // New nav item
    { to: "/reports", icon: BarChart, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  const renderSidebarContent = (isMobileView: boolean) => (
    <>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground overflow-hidden flex-grow min-w-0">
          {companyLogoUrl && (
            <img
              src={companyLogoUrl}
              alt="Company Logo"
              style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
              className="rounded-md flex-shrink-0"
            />
          )}
          {!isCollapsed && (
            <span className="text-lg font-bold whitespace-nowrap overflow-hidden text-ellipsis">
              {displayCompanyName}
            </span>
          )}
        </Link>
        {!isMobileView && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isCollapsed={isCollapsed && !isMobileView}
            />
          ))}
        </nav>
      </div>
    </>
  );

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
            {renderSidebarContent(true)}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full max-h-screen flex-col gap-2 border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      {renderSidebarContent(false)}
    </div>
  );
};

export default Sidebar;