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

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/employees", icon: Users, label: "Employees" },
    { to: "/payslips", icon: ReceiptText, label: "Payslips" },
    { to: "/reports", icon: BarChart, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

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
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
                <ReceiptText className="h-6 w-6" />
                <span className="">Payroll System</span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    isCollapsed={false} // Mobile sidebar is never collapsed
                  />
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
        "flex h-full max-h-screen flex-col gap-2 border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-[240px]"
      )}
    >
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
          <ReceiptText className="h-6 w-6" />
          {!isCollapsed && <span className="">Payroll System</span>}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;