"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings as SettingsIcon, LayoutDashboard, User, Loader2 } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { supabase } from "@/integrations/supabase/client";
import { getBranding } from "@/config/branding";

interface MainLayoutProps {}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const { companyDetails, isLoadingCompanyDetails, pendingCount } = usePayrollProcessor();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const gridColsClass = isCollapsed
    ? "md:grid-cols-[70px_1fr] lg:grid-cols-[70px_1fr]"
    : "md:grid-cols-[260px_1fr] lg:grid-cols-[260px_1fr]";

  // Update the title element without mounting another payroll hook elsewhere
  React.useEffect(() => {
    const titleElement = document.getElementById("app-title");
    if (titleElement) {
      const b = getBranding();
      const name = b.name || companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Payroll App";
      titleElement.innerText = name;
    }
  }, [companyDetails]);

  // Only block on auth loading; allow layout to render while company details load
  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Outlet />;
  }

  return (
    <div className={cn("grid min-h-screen w-full", gridColsClass)}>
      {!isMobile && (
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          companyDetails={companyDetails}
          pendingToDosCount={pendingCount}
        />
      )}
      <div className="flex min-w-0 flex-col bg-background">
        <header
          className={cn(
            "sticky top-0 z-40 flex h-16 items-center gap-4 border-b px-4 backdrop-blur-md lg:px-6",
            isScrolled ? "bg-background/90 shadow-sm" : "bg-background/70"
          )}
        >
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-auto items-center justify-center space-x-2 rounded-xl py-2 hover:bg-card"
              >
                <User className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium leading-none">{user?.name}</span>
                  <span className="text-xs leading-none text-muted-foreground">{user?.email || ""}</span>
                </div>
                <SettingsIcon className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings/user-control-panel")}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex flex-1 flex-col px-4 py-6 lg:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 lg:gap-6">
            {/* Render content even if company details are loading; pages can gate their own content */}
            {isLoadingCompanyDetails && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading company data…</span>
              </div>
            )}
            <Outlet />
          </div>
        </main>

        <MadeWithDyad />
      </div>
      {isMobile && (
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          companyDetails={companyDetails}
          pendingToDosCount={pendingCount}
        />
      )}
    </div>
  );
};

export default MainLayout;