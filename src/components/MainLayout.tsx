"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { AppFooter } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings as SettingsIcon, LayoutDashboard, User, Loader2 } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { isStaffPortalPath, STAFF_LOGIN_PATH } from "@/lib/staff-portal";
import { Suspense } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { supabase } from "@/integrations/supabase/client";
import { getBranding } from "@/config/branding";

interface MainLayoutProps {}

declare global {
  interface Window {
    __tabLag?: Array<{ path: string; paintMs: number; at: number }>;
  }
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const location = useLocation();
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const { companyDetails, isLoadingCompanyDetails, pendingCount } = usePayrollProcessor();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    const path = location.pathname;
    const t0 = performance.now();
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const paintMs = Math.round(performance.now() - t0);
        window.__tabLag = window.__tabLag ?? [];
        window.__tabLag.push({ path, paintMs, at: Date.now() });
        console.info(`[tab-lag] ${path}: ${paintMs}ms to first paint`);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [location.pathname]);

  React.useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    const onStaffPortal = isStaffPortalPath(location.pathname);
    await supabase.auth.signOut();
    navigate(onStaffPortal ? STAFF_LOGIN_PATH : "/login");
  };

  const gridColsClass = isCollapsed
    ? "md:grid-cols-[70px_1fr] lg:grid-cols-[70px_1fr]"
    : "md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr]";

  // Update the title element without mounting another payroll hook elsewhere
  React.useEffect(() => {
    const titleElement = document.getElementById("app-title");
    if (titleElement) {
      const b = getBranding();
      const name = b.shortName || b.name || companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Kan Printers Payroll";
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
          <div className="flex w-full flex-1 flex-col gap-4 lg:gap-6">
            {/* Render content even if company details are loading; pages can gate their own content */}
            {isLoadingCompanyDetails && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading company data…</span>
              </div>
            )}
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </div>
        </main>

        <AppFooter />
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